import { ExecutionFailureError } from '@event-driven-platform/execution';
import type {
    Consumer,
    ConsumerRunConfig,
    EachBatchPayload,
    IHeaders,
    KafkaMessage,
    Producer,
} from 'kafkajs';

import type { EventIngress, EventIngressOutcome } from '../event-ingress.js';
import {
    EVENT_ENVELOPE_HEADER,
    EventEnvelopeWireError,
    reconstructEventEnvelope,
} from './event-envelope-wire.js';
import { InvalidAvroEventPayloadError } from './schema-registry-avro-event-codec.js';

const ORDINARY_RETRY_DELAYS_MS = [1_000, 5_000, 15_000] as const;
const CLAIM_RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000, 30_000] as const;
const JITTER_FACTOR = 0.2;
const CONFLUENT_WIRE_HEADER_BYTES = 5;
const CONFLUENT_WIRE_MAGIC_BYTE = 0;

export type DeliveryFailureKind = 'invalid' | 'unhandled' | 'execution-failure' | 'unknown';

export interface EventValueDecoder {
    decode(value: Buffer): Promise<unknown>;
}

export interface KafkaJsEventConsumerOptions {
    readonly consumer: Consumer;
    readonly producer: Producer;
    readonly codec: EventValueDecoder;
    readonly ingress: EventIngress;
    readonly consumerGroup: string;
    readonly topics: readonly string[];
    readonly heartbeatIntervalMs?: number;
    readonly random?: () => number;
}

interface TerminalFailure {
    readonly kind: DeliveryFailureKind;
    readonly code?: string;
    readonly retryable?: boolean;
}

type DeliveryOutcome =
    | { readonly type: 'handled' }
    | { readonly type: 'terminal'; readonly failure: TerminalFailure }
    | {
          readonly type: 'retryable';
          readonly claimRejected: boolean;
          readonly failure: TerminalFailure;
      };

interface DeliveryContext {
    readonly topic: string;
    readonly partition: number;
    readonly message: KafkaMessage;
    readonly heartbeat: () => Promise<void>;
    readonly isRunning: () => boolean;
    readonly isStale: () => boolean;
}

export class KafkaJsDeliveryOwnershipLostError extends Error {
    public constructor() {
        super('KafkaJS delivery ownership was lost while processing the record.');
        this.name = 'KafkaJsDeliveryOwnershipLostError';
    }
}

export class KafkaJsEventConsumer {
    private readonly heartbeatIntervalMs: number;
    private readonly random: () => number;

    public constructor(private readonly options: KafkaJsEventConsumerOptions) {
        this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 3_000;
        if (!Number.isFinite(this.heartbeatIntervalMs) || this.heartbeatIntervalMs <= 0) {
            throw new Error('KafkaJS event consumer heartbeatIntervalMs must be a positive duration.');
        }
        this.random = options.random ?? Math.random;
    }

    public async run(): Promise<void> {
        if (this.options.topics.length === 0) {
            throw new Error('KafkaJS event consumer requires at least one topic.');
        }

        await this.options.consumer.subscribe({ topics: [...this.options.topics] });

        const config: ConsumerRunConfig = {
            autoCommit: false,
            eachBatchAutoResolve: false,
            eachBatch: (payload) => this.processBatch(payload),
        };

        await this.options.consumer.run(config);
    }

    private async processBatch(payload: EachBatchPayload): Promise<void> {
        for (const message of payload.batch.messages) {
            if (!payload.isRunning() || payload.isStale()) return;

            await this.deliver({
                topic: payload.batch.topic,
                partition: payload.batch.partition,
                message,
                heartbeat: payload.heartbeat,
                isRunning: payload.isRunning,
                isStale: payload.isStale,
            });
        }
    }

    private async deliver(context: DeliveryContext): Promise<void> {
        let attempts = 0;
        let ordinaryRetries = 0;
        let claimRetries = 0;

        while (true) {
            this.assertOwnership(context);
            attempts += 1;
            const outcome = await this.withHeartbeats(context, () => this.dispatch(context.message));

            if (outcome.type === 'handled') {
                await this.commit(context);
                return;
            }
            if (outcome.type === 'terminal') {
                await this.publishDlqThenCommit(context, attempts, outcome.failure);
                return;
            }

            const retryDelays = outcome.claimRejected
                ? CLAIM_RETRY_DELAYS_MS
                : ORDINARY_RETRY_DELAYS_MS;
            const retryIndex = outcome.claimRejected ? claimRetries : ordinaryRetries;
            const delay = retryDelays[retryIndex];
            if (delay === undefined) {
                await this.publishDlqThenCommit(context, attempts, outcome.failure);
                return;
            }
            if (outcome.claimRejected) claimRetries += 1;
            else ordinaryRetries += 1;

            await this.backoff(context, this.withJitter(delay));
        }
    }

    private async dispatch(message: KafkaMessage): Promise<DeliveryOutcome> {
        if (message.value === null || !hasValidConfluentWireHeader(message.value)) {
            return { type: 'terminal', failure: { kind: 'invalid' } };
        }

        let payload: unknown;
        try {
            payload = await this.options.codec.decode(message.value);
        } catch (error: unknown) {
            if (error instanceof InvalidAvroEventPayloadError) {
                return { type: 'terminal', failure: { kind: 'invalid' } };
            }
            throw error;
        }

        let reconstructed;
        try {
            reconstructed = reconstructEventEnvelope(
                message.headers?.[EVENT_ENVELOPE_HEADER],
                payload,
            );
        } catch (error: unknown) {
            if (error instanceof EventEnvelopeWireError) {
                return { type: 'terminal', failure: { kind: 'invalid' } };
            }
            throw error;
        }
        if (reconstructed.status === 'invalid') {
            return { type: 'terminal', failure: { kind: 'invalid' } };
        }

        try {
            const ingressOutcome: EventIngressOutcome = await this.options.ingress.dispatch(
                reconstructed.value,
            );
            if (ingressOutcome.status === 'handled') return { type: 'handled' };

            return {
                type: 'terminal',
                failure: {
                    kind: ingressOutcome.status === 'unhandled' ? 'unhandled' : 'invalid',
                },
            };
        } catch (error: unknown) {
            if (!(error instanceof ExecutionFailureError)) {
                return { type: 'terminal', failure: { kind: 'unknown' } };
            }

            const failure: TerminalFailure = {
                kind: 'execution-failure',
                code: error.executionFailure.code,
                retryable: error.executionFailure.retryable,
            };
            if (!error.executionFailure.retryable) return { type: 'terminal', failure };

            return {
                type: 'retryable',
                claimRejected: error.executionFailure.code === 'already-in-progress',
                failure,
            };
        }
    }

    private async publishDlqThenCommit(
        context: DeliveryContext,
        attempts: number,
        failure: TerminalFailure,
    ): Promise<void> {
        this.assertOwnership(context);
        const headers: IHeaders = {
            ...(context.message.headers ?? {}),
            'ab.dlq.id': `${context.topic}:${context.partition}:${context.message.offset}`,
            'ab.dlq.source-topic': context.topic,
            'ab.dlq.source-partition': String(context.partition),
            'ab.dlq.source-offset': context.message.offset,
            'ab.dlq.consumer-group': this.options.consumerGroup,
            'ab.dlq.failed-at': new Date().toISOString(),
            'ab.dlq.attempts': String(attempts),
            'ab.dlq.failure-kind': failure.kind,
        };
        if (failure.code !== undefined) headers['ab.dlq.execution-code'] = failure.code;
        if (failure.retryable !== undefined) {
            headers['ab.dlq.execution-retryable'] = String(failure.retryable);
        }

        await this.withHeartbeats(context, () =>
            this.options.producer.send({
                topic: `${context.topic}.dlq`,
                messages: [{ key: context.message.key, value: context.message.value, headers }],
            }),
        );
        this.assertOwnership(context);
        await this.commit(context);
    }

    private async commit(context: DeliveryContext): Promise<void> {
        this.assertOwnership(context);
        await this.withHeartbeats(context, () =>
            this.options.consumer.commitOffsets([
                {
                    topic: context.topic,
                    partition: context.partition,
                    offset: (BigInt(context.message.offset) + 1n).toString(),
                },
            ]),
        );
    }

    private async backoff(context: DeliveryContext, delayMs: number): Promise<void> {
        let remaining = delayMs;
        while (remaining > 0) {
            this.assertOwnership(context);
            const interval = Math.min(remaining, this.heartbeatIntervalMs);
            await sleep(interval);
            remaining -= interval;
            this.assertOwnership(context);
            await context.heartbeat();
        }
    }

    private async withHeartbeats<T>(
        context: DeliveryContext,
        operation: () => Promise<T>,
    ): Promise<T> {
        const controller = new AbortController();
        let heartbeatFailure: unknown;
        const heartbeatLoop = this.heartbeatUntilStopped(context, controller.signal).catch(
            (error: unknown) => {
                heartbeatFailure = error;
            },
        );
        let result: T;

        try {
            result = await operation();
        } finally {
            controller.abort();
            await heartbeatLoop;
        }

        if (heartbeatFailure !== undefined) throw heartbeatFailure;
        this.assertOwnership(context);
        return result;
    }

    private async heartbeatUntilStopped(
        context: DeliveryContext,
        signal: AbortSignal,
    ): Promise<void> {
        while (!(await sleepUntilAborted(this.heartbeatIntervalMs, signal))) {
            this.assertOwnership(context);
            await context.heartbeat();
        }
    }

    private assertOwnership(context: DeliveryContext): void {
        if (!context.isRunning() || context.isStale()) {
            throw new KafkaJsDeliveryOwnershipLostError();
        }
    }

    private withJitter(baseMs: number): number {
        return baseMs + Math.floor(baseMs * JITTER_FACTOR * this.random());
    }
}

function hasValidConfluentWireHeader(value: Buffer): boolean {
    return value.length >= CONFLUENT_WIRE_HEADER_BYTES && value[0] === CONFLUENT_WIRE_MAGIC_BYTE;
}

function sleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function sleepUntilAborted(delayMs: number, signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return Promise.resolve(true);

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve(false);
        }, delayMs);
        const onAbort = () => {
            clearTimeout(timeout);
            resolve(true);
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}
