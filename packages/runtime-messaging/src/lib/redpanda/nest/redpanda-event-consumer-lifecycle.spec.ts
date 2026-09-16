import type { Consumer, Producer } from 'kafkajs';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeMessagingBootstrap } from '../../nest/runtime-messaging-bootstrap.js';
import type { KafkaJsEventConsumer } from '../kafkajs-event-consumer.js';
import { RedpandaEventConsumerLifecycle } from './redpanda-event-consumer-lifecycle.js';

function createHarness(options?: {
    readonly consumerConnect?: () => Promise<void>;
    readonly consumerDisconnect?: () => Promise<void>;
    readonly producerConnect?: () => Promise<void>;
    readonly producerDisconnect?: () => Promise<void>;
    readonly deliveryRun?: () => Promise<void>;
}) {
    const calls: string[] = [];
    const messagingBootstrap = {
        seal: vi.fn(() => {
            calls.push('seal');
        }),
    } as unknown as RuntimeMessagingBootstrap;
    const consumer = {
        connect: vi.fn(async () => {
            calls.push('consumer.connect');
            await options?.consumerConnect?.();
        }),
        disconnect: vi.fn(async () => {
            calls.push('consumer.disconnect');
            await options?.consumerDisconnect?.();
        }),
    } as unknown as Pick<Consumer, 'connect' | 'disconnect'>;
    const producer = {
        connect: vi.fn(async () => {
            calls.push('producer.connect');
            await options?.producerConnect?.();
        }),
        disconnect: vi.fn(async () => {
            calls.push('producer.disconnect');
            await options?.producerDisconnect?.();
        }),
    } as unknown as Pick<Producer, 'connect' | 'disconnect'>;
    const delivery = {
        run: vi.fn(async () => {
            calls.push('delivery.run');
            await options?.deliveryRun?.();
        }),
    } as unknown as Pick<KafkaJsEventConsumer, 'run'>;
    const lifecycle = new RedpandaEventConsumerLifecycle({
        messagingBootstrap,
        consumer,
        producer,
        delivery,
    });

    return { calls, messagingBootstrap, consumer, producer, delivery, lifecycle };
}

describe('RedpandaEventConsumerLifecycle', () => {
    it('seals messaging before connecting and enters running only after the delivery loop starts', async () => {
        const harness = createHarness();

        await harness.lifecycle.start();

        expect(harness.calls).toEqual([
            'seal',
            'producer.connect',
            'consumer.connect',
            'delivery.run',
        ]);
        expect(harness.lifecycle.currentState).toBe('running');
    });

    it('does not connect broker resources when registry sealing fails', async () => {
        const harness = createHarness();
        const sealFailure = new Error('registry cannot seal');
        vi.mocked(harness.messagingBootstrap.seal).mockImplementationOnce(() => {
            throw sealFailure;
        });

        await expect(harness.lifecycle.start()).rejects.toBe(sealFailure);

        expect(harness.lifecycle.currentState).toBe('failed');
        expect(harness.consumer.connect).not.toHaveBeenCalled();
        expect(harness.producer.connect).not.toHaveBeenCalled();
    });

    it('keeps a failed state and cleans up already connected startup resources', async () => {
        const startupFailure = new Error('delivery failed to start');
        const harness = createHarness({
            deliveryRun: async () => {
                throw startupFailure;
            },
        });

        await expect(harness.lifecycle.start()).rejects.toBe(startupFailure);

        expect(harness.lifecycle.currentState).toBe('failed');
        expect(harness.calls).toEqual([
            'seal',
            'producer.connect',
            'consumer.connect',
            'delivery.run',
            'consumer.disconnect',
            'producer.disconnect',
        ]);
    });
});
