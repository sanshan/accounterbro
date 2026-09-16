import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import type { Consumer, Producer } from 'kafkajs';

import { RuntimeMessagingBootstrap } from '../../nest/runtime-messaging-bootstrap.js';
import type { KafkaJsEventConsumer } from '../kafkajs-event-consumer.js';

export type RedpandaEventConsumerLifecycleState =
    | 'idle'
    | 'starting'
    | 'running'
    | 'stopping'
    | 'stopped'
    | 'failed';

export interface RedpandaEventConsumerLifecycleDependencies {
    readonly messagingBootstrap: RuntimeMessagingBootstrap;
    readonly consumer: Pick<Consumer, 'connect' | 'disconnect'>;
    readonly producer: Pick<Producer, 'connect' | 'disconnect'>;
    readonly delivery: Pick<KafkaJsEventConsumer, 'run' | 'beginShutdown' | 'drain'>;
    readonly drainTimeoutMs: number;
}

@Injectable()
export class RedpandaEventConsumerLifecycle implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly drainTimeoutMs: number;

    private state: RedpandaEventConsumerLifecycleState = 'idle';
    private startPromise: Promise<void> | undefined;
    private stopPromise: Promise<void> | undefined;
    private consumerConnected = false;
    private producerConnected = false;
    private deliveryStarted = false;

    public constructor(private readonly dependencies: RedpandaEventConsumerLifecycleDependencies) {
        this.drainTimeoutMs = dependencies.drainTimeoutMs;
        if (!Number.isFinite(this.drainTimeoutMs) || this.drainTimeoutMs < 0) {
            throw new Error('Redpanda consumer drain timeout must be a non-negative duration.');
        }
    }

    public get currentState(): RedpandaEventConsumerLifecycleState {
        return this.state;
    }

    public async start(): Promise<void> {
        if (this.startPromise !== undefined) return this.startPromise;
        if (this.state === 'stopping' || this.state === 'stopped') {
            throw new Error('Redpanda event consumer cannot be started after shutdown has begun.');
        }

        this.startPromise = this.startInternal();
        return this.startPromise;
    }

    public async stop(): Promise<void> {
        if (this.stopPromise !== undefined) return this.stopPromise;

        this.stopPromise = this.stopInternal();
        return this.stopPromise;
    }

    public async onApplicationBootstrap(): Promise<void> {
        await this.start();
    }

    public async onModuleDestroy(): Promise<void> {
        await this.stop();
    }

    private async startInternal(): Promise<void> {
        this.state = 'starting';

        try {
            this.dependencies.messagingBootstrap.seal();

            await this.dependencies.producer.connect();
            this.producerConnected = true;
            if (this.state === 'stopping') return;

            await this.dependencies.consumer.connect();
            this.consumerConnected = true;
            if (this.state === 'stopping') return;

            await this.dependencies.delivery.run();
            this.deliveryStarted = true;
            if (this.state === 'stopping') return;

            this.state = 'running';
        } catch (error: unknown) {
            if (this.state !== 'stopping') this.state = 'failed';
            await this.cleanupAfterStartupFailure();
            throw error;
        }
    }

    private async stopInternal(): Promise<void> {
        if (this.state === 'idle' || this.state === 'stopped') {
            this.state = 'stopped';
            return;
        }
        if (this.state === 'failed') {
            await this.cleanupAfterStartupFailure();
            return;
        }

        const startupWasPending = this.state === 'starting';
        this.state = 'stopping';
        if (startupWasPending) await this.awaitStartupSettlement();

        const deadline = Date.now() + this.drainTimeoutMs;

        if (this.deliveryStarted) {
            this.dependencies.delivery.beginShutdown();
            await this.dependencies.delivery.drain(this.remaining(deadline));
        }

        if (this.consumerConnected) {
            await this.settleWithin(this.dependencies.consumer.disconnect(), deadline);
            this.consumerConnected = false;
        }

        if (this.producerConnected) {
            await this.settleWithin(this.dependencies.producer.disconnect(), deadline);
            this.producerConnected = false;
        }

        this.state = 'stopped';
    }

    private async awaitStartupSettlement(): Promise<void> {
        if (this.startPromise === undefined) return;

        try {
            await this.startPromise;
        } catch {
            // Startup owns its failure and cleanup; shutdown only waits until that work has settled.
        }
    }

    private async cleanupAfterStartupFailure(): Promise<void> {
        if (this.consumerConnected) {
            await this.ignoreFailure(this.dependencies.consumer.disconnect());
            this.consumerConnected = false;
        }
        if (this.producerConnected) {
            await this.ignoreFailure(this.dependencies.producer.disconnect());
            this.producerConnected = false;
        }
    }

    private remaining(deadline: number): number {
        return Math.max(0, deadline - Date.now());
    }

    private async settleWithin(operation: Promise<unknown>, deadline: number): Promise<void> {
        const timeoutMs = this.remaining(deadline);
        if (timeoutMs === 0) {
            void operation.catch(() => undefined);
            return;
        }

        let timeout: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            operation.catch(() => undefined),
            new Promise<void>((resolve) => {
                timeout = setTimeout(resolve, timeoutMs);
            }),
        ]);
        if (timeout !== undefined) clearTimeout(timeout);
    }

    private async ignoreFailure(operation: Promise<unknown>): Promise<void> {
        try {
            await operation;
        } catch {
            // Startup cleanup is best effort; the original startup failure remains authoritative.
        }
    }
}
