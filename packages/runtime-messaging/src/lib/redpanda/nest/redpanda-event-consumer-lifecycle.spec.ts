import type { Consumer, Producer } from 'kafkajs';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeMessagingBootstrap } from '../../nest/runtime-messaging-bootstrap.js';
import type { KafkaJsEventConsumer } from '../kafkajs-event-consumer.js';
import {
    RedpandaEventConsumerLifecycle,
    RedpandaEventConsumerReadinessCheck,
} from './redpanda-event-consumer-lifecycle.js';

function createHarness(options?: {
    readonly consumerConnect?: () => Promise<void>;
    readonly deliveryDrain?: (timeoutMs: number) => Promise<boolean>;
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
        stop: vi.fn(async () => {
            calls.push('consumer.stop');
        }),
        disconnect: vi.fn(async () => {
            calls.push('consumer.disconnect');
        }),
    } as unknown as Pick<Consumer, 'connect' | 'stop' | 'disconnect'>;
    const producer = {
        connect: vi.fn(async () => {
            calls.push('producer.connect');
        }),
        disconnect: vi.fn(async () => {
            calls.push('producer.disconnect');
        }),
    } as unknown as Pick<Producer, 'connect' | 'disconnect'>;
    const delivery = {
        run: vi.fn(async () => {
            calls.push('delivery.run');
        }),
        beginShutdown: vi.fn(() => {
            calls.push('delivery.beginShutdown');
        }),
        drain: vi.fn(async (timeoutMs: number) => {
            calls.push('delivery.drain');
            return (await options?.deliveryDrain?.(timeoutMs)) ?? true;
        }),
    } as unknown as Pick<KafkaJsEventConsumer, 'run' | 'beginShutdown' | 'drain'>;
    const lifecycle = new RedpandaEventConsumerLifecycle({
        messagingBootstrap,
        consumer,
        producer,
        delivery,
        drainTimeoutMs: 1_000,
    });
    const readiness = new RedpandaEventConsumerReadinessCheck(lifecycle);

    return { calls, messagingBootstrap, consumer, producer, delivery, lifecycle, readiness };
}

describe('RedpandaEventConsumerLifecycle', () => {
    it('seals messaging before connecting and becomes ready only after the delivery loop starts', async () => {
        const harness = createHarness();

        await expect(harness.readiness.check()).rejects.toThrow('not ready (idle)');
        await harness.lifecycle.start();

        expect(harness.calls).toEqual([
            'seal',
            'producer.connect',
            'consumer.connect',
            'delivery.run',
        ]);
        await expect(harness.readiness.check()).resolves.toBeUndefined();
        expect(harness.lifecycle.currentState).toBe('running');
    });

    it('keeps readiness failing and cleans up connected resources after startup failure', async () => {
        const startupFailure = new Error('consumer connection failed');
        const harness = createHarness({
            consumerConnect: async () => {
                throw startupFailure;
            },
        });

        await expect(harness.lifecycle.start()).rejects.toBe(startupFailure);

        expect(harness.lifecycle.currentState).toBe('failed');
        await expect(harness.readiness.check()).rejects.toThrow('not ready (failed)');
        expect(harness.consumer.disconnect).not.toHaveBeenCalled();
        expect(harness.producer.disconnect).toHaveBeenCalledTimes(1);
    });

    it('marks readiness stopping before drain and disconnects consumer before the DLQ producer', async () => {
        let finishDrain: ((value: boolean) => void) | undefined;
        const harness = createHarness({
            deliveryDrain: () =>
                new Promise<boolean>((resolve) => {
                    finishDrain = resolve;
                }),
        });
        await harness.lifecycle.start();
        harness.calls.length = 0;

        const stop = harness.lifecycle.stop();

        expect(harness.lifecycle.currentState).toBe('stopping');
        await expect(harness.readiness.check()).rejects.toThrow('not ready (stopping)');
        expect(harness.calls).toEqual(['delivery.beginShutdown', 'delivery.drain']);
        expect(harness.consumer.stop).not.toHaveBeenCalled();

        finishDrain?.(true);
        await stop;

        expect(harness.calls).toEqual([
            'delivery.beginShutdown',
            'delivery.drain',
            'consumer.stop',
            'consumer.disconnect',
            'producer.disconnect',
        ]);
        expect(harness.lifecycle.currentState).toBe('stopped');
    });

    it('does not connect broker resources when registry sealing fails', async () => {
        const harness = createHarness();
        const sealFailure = new Error('registry cannot seal');
        vi.mocked(harness.messagingBootstrap.seal).mockImplementationOnce(() => {
            throw sealFailure;
        });

        await expect(harness.lifecycle.start()).rejects.toBe(sealFailure);

        expect(harness.consumer.connect).not.toHaveBeenCalled();
        expect(harness.producer.connect).not.toHaveBeenCalled();
        await expect(harness.readiness.check()).rejects.toThrow('not ready (failed)');
    });
});
