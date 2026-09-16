import type { Consumer, Producer } from 'kafkajs';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeMessagingBootstrap } from '../../nest/runtime-messaging-bootstrap.js';
import type { KafkaJsEventConsumer } from '../kafkajs-event-consumer.js';
import { RedpandaEventConsumerLifecycle } from './redpanda-event-consumer-lifecycle.js';

function createHarness(options?: {
    readonly consumerConnect?: () => Promise<void>;
    readonly consumerDisconnect?: () => Promise<void>;
    readonly deliveryDrain?: (timeoutMs: number) => Promise<boolean>;
    readonly drainTimeoutMs?: number;
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
        drainTimeoutMs: options?.drainTimeoutMs ?? 1_000,
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

    it('keeps a failed state and cleans up connected resources after startup failure', async () => {
        const startupFailure = new Error('consumer connection failed');
        const harness = createHarness({
            consumerConnect: async () => {
                throw startupFailure;
            },
        });

        await expect(harness.lifecycle.start()).rejects.toBe(startupFailure);

        expect(harness.lifecycle.currentState).toBe('failed');
        expect(harness.consumer.disconnect).not.toHaveBeenCalled();
        expect(harness.producer.disconnect).toHaveBeenCalledTimes(1);
    });

    it('waits for pending startup before draining and cannot return to running after stop', async () => {
        let finishConnect: (() => void) | undefined;
        const harness = createHarness({
            consumerConnect: () =>
                new Promise<void>((resolve) => {
                    finishConnect = resolve;
                }),
        });

        const start = harness.lifecycle.start();
        await vi.waitFor(() => expect(harness.consumer.connect).toHaveBeenCalledTimes(1));

        const stop = harness.lifecycle.stop();
        expect(harness.consumer.disconnect).not.toHaveBeenCalled();

        finishConnect?.();
        await Promise.all([start, stop]);

        expect(harness.calls).toEqual([
            'seal',
            'producer.connect',
            'consumer.connect',
            'delivery.run',
            'delivery.beginShutdown',
            'delivery.drain',
            'consumer.disconnect',
            'producer.disconnect',
        ]);
        expect(harness.lifecycle.currentState).toBe('stopped');
    });

    it('enters stopping before drain and disconnects the consumer before the DLQ producer', async () => {
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
        expect(harness.calls).toEqual(['delivery.beginShutdown', 'delivery.drain']);
        expect(harness.consumer.disconnect).not.toHaveBeenCalled();

        finishDrain?.(true);
        await stop;

        expect(harness.calls).toEqual([
            'delivery.beginShutdown',
            'delivery.drain',
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

        expect(harness.lifecycle.currentState).toBe('failed');
        expect(harness.consumer.connect).not.toHaveBeenCalled();
        expect(harness.producer.connect).not.toHaveBeenCalled();
    });

    it('keeps shutdown bounded when a broker disconnect does not settle', async () => {
        const harness = createHarness({
            drainTimeoutMs: 0,
            consumerDisconnect: () => new Promise<void>(() => undefined),
        });
        await harness.lifecycle.start();
        harness.calls.length = 0;

        await harness.lifecycle.stop();

        expect(harness.delivery.drain).toHaveBeenCalledWith(0);
        expect(harness.calls).toEqual([
            'delivery.beginShutdown',
            'delivery.drain',
            'consumer.disconnect',
            'producer.disconnect',
        ]);
        expect(harness.lifecycle.currentState).toBe('stopped');
    });
});
