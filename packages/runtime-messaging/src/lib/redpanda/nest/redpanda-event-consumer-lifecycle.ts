import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import type { Consumer, Producer } from 'kafkajs';

import { RuntimeMessagingBootstrap } from '../../nest/runtime-messaging-bootstrap.js';
import type { KafkaJsEventConsumer } from '../kafkajs-event-consumer.js';

export type RedpandaEventConsumerLifecycleState = 'idle' | 'starting' | 'running' | 'failed';

export interface RedpandaEventConsumerLifecycleDependencies {
    readonly messagingBootstrap: RuntimeMessagingBootstrap;
    readonly consumer: Pick<Consumer, 'connect' | 'disconnect'>;
    readonly producer: Pick<Producer, 'connect' | 'disconnect'>;
    readonly delivery: Pick<KafkaJsEventConsumer, 'run'>;
}

@Injectable()
export class RedpandaEventConsumerLifecycle implements OnApplicationBootstrap {
    private state: RedpandaEventConsumerLifecycleState = 'idle';
    private startPromise: Promise<void> | undefined;
    private consumerConnected = false;
    private producerConnected = false;

    public constructor(private readonly dependencies: RedpandaEventConsumerLifecycleDependencies) {}

    public get currentState(): RedpandaEventConsumerLifecycleState {
        return this.state;
    }

    public async start(): Promise<void> {
        if (this.startPromise !== undefined) return this.startPromise;

        this.startPromise = this.startInternal();
        return this.startPromise;
    }

    public async onApplicationBootstrap(): Promise<void> {
        await this.start();
    }

    private async startInternal(): Promise<void> {
        this.state = 'starting';

        try {
            this.dependencies.messagingBootstrap.seal();

            await this.dependencies.producer.connect();
            this.producerConnected = true;

            await this.dependencies.consumer.connect();
            this.consumerConnected = true;

            await this.dependencies.delivery.run();
            this.state = 'running';
        } catch (error: unknown) {
            this.state = 'failed';
            await this.cleanupAfterStartupFailure();
            throw error;
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

    private async ignoreFailure(operation: Promise<unknown>): Promise<void> {
        try {
            await operation;
        } catch {
            // Startup cleanup is best effort; the original startup failure remains authoritative.
        }
    }
}
