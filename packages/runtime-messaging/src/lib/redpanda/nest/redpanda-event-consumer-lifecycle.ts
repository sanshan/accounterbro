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
        if (this.isShutdownRequested()) {
            throw new Error('Redpanda event consumer cannot be started after shutdown has begun.');
        }
        if (this.startPromise !== undefined) return this.startPromise;

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
            if (this.isShutdownRequested()) return;

            await this.dependencies.consumer.connect();
            this.consumerConnected = true;
            if (this.isShutdownRequested()) return;

            await this.dependencies.delivery.run();
            this.deliveryStarted = true;
            if (this.isShutdownRequested()) return;

            this.state = 'running';
        } catch (error: unknown) {
            if (!this.isShutdownRequested()) this.state = 'failed';
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

        const deadline = Date.now() + this.drainTimeoutMs;
        const startupWasPending = this.state === 'starting';
        this.state = 'stopping';

        if (startupWasPending) {
            const startupSettled = await this.settleWithin(this.awaitStartupSettlement(), deadline);
            if (!startupSettled) {
                this.state = 'stopped';
                this.deferShutdownAfterStartup();
                return;
            }
        }

        if (this.deliveryStarted) {
            this.dependencies.delivery.beginShutdown();
            await this.dependencies.delivery.drain(this.remaining(deadline));
        }

        await this.disconnectWithin(deadline);
        this.state = 'stopped';
    }

    private isShutdownRequested(): boolean {
        return this.state === 'stopping' || this.state === 'stopped';
    }

    private async awaitStartupSettlement(): Promise<void> {
        if (this.startPromise === undefined) return;

        try {
            await this.startPromise;
        } catch {
            // Startup owns its failure and cleanup; shutdown only waits until that work has settled.
        }
    }

    private deferShutdownAfterStartup(): void {
        void this.awaitStartupSettlement().then(() => this.finishDeferredShutdown());
    }

    private async finishDeferredShutdown(): Promise<void> {
        if (this.deliveryStarted) {
            this.dependencies.delivery.beginShutdown();
            await this.ignoreFailure(this.dependencies.delivery.drain(0));
        }

        await this.disconnectConsumerThenProducerBestEffort();
    }

    private async disconnectWithin(deadline: number): Promise<void> {
        if (this.consumerConnected) {
            const consumerDisconnect = this.dependencies.consumer.disconnect();
            const consumerSettled = await this.settleWithin(consumerDisconnect, deadline);
            if (!consumerSettled) {
                this.deferProducerDisconnectAfterConsumer(consumerDisconnect);
                return;
            }
            this.consumerConnected = false;
        }

        if (!this.producerConnected) return;

        const producerDisconnect = this.dependencies.producer.disconnect();
        const producerSettled = await this.settleWithin(producerDisconnect, deadline);
        if (producerSettled) {
            this.producerConnected = false;
            return;
        }

        void this.ignoreFailure(producerDisconnect).then(() => {
            this.producerConnected = false;
        });
    }

    private deferProducerDisconnectAfterConsumer(consumerDisconnect: Promise<unknown>): void {
        void this.ignoreFailure(consumerDisconnect).then(async () => {
            this.consumerConnected = false;
            await this.disconnectProducerBestEffort();
        });
    }

    private async disconnectConsumerThenProducerBestEffort(): Promise<void> {
        if (this.consumerConnected) {
            await this.ignoreFailure(this.dependencies.consumer.disconnect());
            this.consumerConnected = false;
        }

        await this.disconnectProducerBestEffort();
    }

    private async disconnectProducerBestEffort(): Promise<void> {
        if (!this.producerConnected) return;

        await this.ignoreFailure(this.dependencies.producer.disconnect());
        this.producerConnected = false;
    }

    private async cleanupAfterStartupFailure(): Promise<void> {
        await this.disconnectConsumerThenProducerBestEffort();
    }

    private remaining(deadline: number): number {
        return Math.max(0, deadline - Date.now());
    }

    private async settleWithin(operation: Promise<unknown>, deadline: number): Promise<boolean> {
        const timeoutMs = this.remaining(deadline);
        if (timeoutMs === 0) return false;

        let timeout: ReturnType<typeof setTimeout> | undefined;
        const settled = await Promise.race([
            operation.then(
                () => true,
                () => true,
            ),
            new Promise<boolean>((resolve) => {
                timeout = setTimeout(() => resolve(false), timeoutMs);
            }),
        ]);
        if (timeout !== undefined) clearTimeout(timeout);
        return settled;
    }

    private async ignoreFailure(operation: Promise<unknown>): Promise<void> {
        try {
            await operation;
        } catch {
            // Shutdown cleanup is best effort; lifecycle state remains authoritative.
        }
    }
}
