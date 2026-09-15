import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { Consumer, ConsumerRunConfig, EachBatchPayload, Producer } from 'kafkajs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventIngress, EventIngressOutcome } from '../event-ingress.js';
import { createEventEnvelope } from '../testing/event-envelope.fixture.js';
import { validateEventEnvelope } from '../validate-event-envelope.js';
import { EVENT_ENVELOPE_HEADER, encodeEventEnvelopeHeader } from './event-envelope-wire.js';
import type { EventValueDecoder } from './event-value-decoder.js';
import { KafkaJsEventConsumer } from './kafkajs-event-consumer.js';

const TOPIC = 'test.event';

function validEnvelope() {
    const result = validateEventEnvelope(createEventEnvelope());
    if (result.status !== 'valid') throw new Error('Expected a valid EventEnvelope fixture.');
    return result.value;
}

function createHarness(ingressDispatch: EventIngress['dispatch'], heartbeatIntervalMs = 3_000) {
    const envelope = validEnvelope();
    let eachBatch: ConsumerRunConfig['eachBatch'];
    const pause = vi.fn();
    const commitOffsets = vi.fn(async () => undefined);
    const consumer = {
        subscribe: vi.fn(async () => undefined),
        run: vi.fn(async (config: ConsumerRunConfig) => {
            eachBatch = config.eachBatch;
        }),
        pause,
        commitOffsets,
    } as unknown as Consumer;
    const send = vi.fn(async () => []);
    const producer = { send } as unknown as Producer;
    const codec: EventValueDecoder = {
        decode: async () => ({ status: 'decoded', value: envelope.payload }),
    };
    const dispatch = vi.fn(ingressDispatch);
    const ingress = { dispatch } as unknown as EventIngress;
    const adapter = new KafkaJsEventConsumer({
        consumer,
        producer,
        codec,
        ingress,
        consumerGroup: 'test-consumer',
        topics: [TOPIC],
        heartbeatIntervalMs,
        random: () => 0,
    });

    const message = (offset: string) => ({
        key: Buffer.from('aggregate-1'),
        value: Buffer.from('registry-framed-value'),
        timestamp: '0',
        attributes: 0,
        offset,
        headers: { [EVENT_ENVELOPE_HEADER]: encodeEventEnvelopeHeader(envelope) },
    });
    const payload = {
        batch: {
            topic: TOPIC,
            partition: 0,
            highWatermark: '2',
            messages: [message('0'), message('1')],
        },
        resolveOffset: vi.fn(),
        heartbeat: vi.fn(async () => undefined),
        pause: vi.fn(),
        commitOffsetsIfNecessary: vi.fn(async () => undefined),
        uncommittedOffsets: vi.fn(() => ({})),
        isRunning: () => true,
        isStale: () => false,
    } as unknown as EachBatchPayload;

    return {
        adapter,
        pause,
        commitOffsets,
        send,
        ingress: { dispatch },
        async startBatch() {
            await adapter.run();
            if (eachBatch === undefined) throw new Error('KafkaJS eachBatch callback was not configured.');
            return eachBatch(payload);
        },
    };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('KafkaJsEventConsumer shutdown', () => {
    it('stops scheduling new records while allowing the active terminal outcome to commit', async () => {
        let finishDispatch: ((value: EventIngressOutcome) => void) | undefined;
        const harness = createHarness(
            () =>
                new Promise<EventIngressOutcome>((resolve) => {
                    finishDispatch = resolve;
                }),
        );

        const batch = harness.startBatch();
        await vi.waitFor(() => expect(harness.ingress.dispatch).toHaveBeenCalledTimes(1));

        harness.adapter.beginShutdown();
        await expect(harness.adapter.drain(0)).resolves.toBe(false);

        finishDispatch?.({ status: 'handled', result: undefined });
        await batch;

        await expect(harness.adapter.drain(10)).resolves.toBe(true);
        expect(harness.pause).toHaveBeenCalledWith([{ topic: TOPIC }]);
        expect(harness.ingress.dispatch).toHaveBeenCalledTimes(1);
        expect(harness.commitOffsets).toHaveBeenCalledTimes(1);
        expect(harness.commitOffsets).toHaveBeenCalledWith([
            { topic: TOPIC, partition: 0, offset: '1' },
        ]);
    });

    it('abandons a pending retry after shutdown instead of starting another attempt', async () => {
        vi.useFakeTimers();
        const harness = createHarness(async () => {
            throw new ExecutionFailureError({
                code: 'temporarily-unavailable',
                message: 'retry later',
                retryable: true,
            });
        }, 10);

        const batch = harness.startBatch();
        await vi.advanceTimersByTimeAsync(0);
        expect(harness.ingress.dispatch).toHaveBeenCalledTimes(1);

        harness.adapter.beginShutdown();
        await vi.advanceTimersByTimeAsync(10);
        await batch;

        expect(harness.ingress.dispatch).toHaveBeenCalledTimes(1);
        expect(harness.commitOffsets).not.toHaveBeenCalled();
        expect(harness.send).not.toHaveBeenCalled();
        await expect(harness.adapter.drain(0)).resolves.toBe(true);
    });
});
