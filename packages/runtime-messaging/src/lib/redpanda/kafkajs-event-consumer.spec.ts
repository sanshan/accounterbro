import type { Consumer, ConsumerRunConfig, EachBatchPayload, Producer } from 'kafkajs';
import { describe, expect, it, vi } from 'vitest';

import type { EventIngress } from '../event-ingress.js';
import type { EventValueDecoder } from './event-value-decoder.js';
import { KafkaJsEventConsumer } from './kafkajs-event-consumer.js';

const TOPIC = 'test.event';
const FRAMED_VALUE = Buffer.from('registry-framed-value-fixture');

function createPayload(): EachBatchPayload {
    return {
        batch: {
            topic: TOPIC,
            partition: 2,
            highWatermark: '8',
            messages: [
                {
                    key: Buffer.from('aggregate-1'),
                    value: FRAMED_VALUE,
                    timestamp: '0',
                    attributes: 0,
                    offset: '7',
                    headers: {},
                },
            ],
        },
        resolveOffset: vi.fn(),
        heartbeat: vi.fn(async () => undefined),
        pause: vi.fn(),
        commitOffsetsIfNecessary: vi.fn(async () => undefined),
        uncommittedOffsets: vi.fn(() => ({})),
        isRunning: () => true,
        isStale: () => false,
    } as unknown as EachBatchPayload;
}

function createHarness(decode: EventValueDecoder['decode']) {
    let eachBatch: ConsumerRunConfig['eachBatch'];
    const subscribe = vi.fn(async () => undefined);
    const commitOffsets = vi.fn(async () => undefined);
    const consumer = {
        subscribe,
        run: vi.fn(async (config: ConsumerRunConfig) => {
            eachBatch = config.eachBatch;
        }),
        commitOffsets,
    } as unknown as Consumer;
    const send = vi.fn(async () => []);
    const producer = { send } as unknown as Producer;
    const ingressDispatch = vi.fn();
    const ingress = { dispatch: ingressDispatch } as unknown as EventIngress;
    const codec: EventValueDecoder = { decode };
    const adapter = new KafkaJsEventConsumer({
        consumer,
        producer,
        codec,
        ingress,
        consumerGroup: 'test-consumer',
        topics: [TOPIC],
    });

    return {
        subscribe,
        commitOffsets,
        send,
        ingressDispatch,
        async runBatch() {
            await adapter.run();
            if (eachBatch === undefined) throw new Error('KafkaJS eachBatch callback was not configured.');
            await eachBatch(createPayload());
        },
    };
}

describe('KafkaJsEventConsumer decode failure handling', () => {
    it('publishes an explicitly invalid decoded value to the DLQ before committing its offset', async () => {
        const harness = createHarness(async () => ({ status: 'invalid' }));

        await harness.runBatch();

        expect(harness.subscribe).toHaveBeenCalledWith({ topics: [TOPIC] });
        expect(harness.ingressDispatch).not.toHaveBeenCalled();
        expect(harness.send).toHaveBeenCalledTimes(1);
        expect(harness.send).toHaveBeenCalledWith({
            topic: `${TOPIC}.dlq`,
            messages: [
                expect.objectContaining({
                    key: Buffer.from('aggregate-1'),
                    value: FRAMED_VALUE,
                    headers: expect.objectContaining({
                        'ab.dlq.id': `${TOPIC}:2:7`,
                        'ab.dlq.failure-kind': 'invalid',
                    }),
                }),
            ],
        });
        expect(harness.commitOffsets).toHaveBeenCalledWith([
            {
                topic: TOPIC,
                partition: 2,
                offset: '8',
            },
        ]);
    });

    it('leaves unclassified decode failures uncommitted and out of the DLQ', async () => {
        const registryFailure = new Error('schema registry unavailable');
        const harness = createHarness(async () => {
            throw registryFailure;
        });

        await expect(harness.runBatch()).rejects.toBe(registryFailure);

        expect(harness.ingressDispatch).not.toHaveBeenCalled();
        expect(harness.send).not.toHaveBeenCalled();
        expect(harness.commitOffsets).not.toHaveBeenCalled();
    });
});
