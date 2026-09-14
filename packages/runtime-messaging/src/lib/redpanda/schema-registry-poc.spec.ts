import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { Kafka } from 'kafkajs';
import { describe, expect, it } from 'vitest';

import { getEventAvroRenderOptions } from './avro-naming.js';

const SCHEMA_ID = 17;
const POC_SCHEMA = {
    type: 'record',
    ...getEventAvroRenderOptions('poc.event'),
    fields: [{ name: 'message', type: 'string' }],
};

interface RegistryRequest {
    readonly method: string | undefined;
    readonly url: string | undefined;
}

async function withSchemaRegistryStub<T>(
    run: (host: string, requests: RegistryRequest[]) => Promise<T>,
): Promise<T> {
    const requests: RegistryRequest[] = [];
    const server = createServer((request, response) => {
        requests.push({ method: request.method, url: request.url });

        if (request.method === 'GET' && request.url === `/schemas/ids/${SCHEMA_ID}`) {
            response.statusCode = 200;
            response.setHeader('content-type', 'application/json');
            response.end(
                JSON.stringify({
                    schema: JSON.stringify(POC_SCHEMA),
                }),
            );
            return;
        }

        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ error_code: 40403, message: 'Schema not found' }));
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address() as AddressInfo;

    try {
        return await run(`http://127.0.0.1:${address.port}`, requests);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error === undefined) {
                    resolve();
                } else {
                    reject(error);
                }
            });
        });
    }
}

describe('Redpanda client POC', () => {
    it('uses KafkaJS 2.x consumer primitives without connecting during the wire POC', () => {
        const kafka = new Kafka({
            clientId: 'runtime-messaging-redpanda-poc',
            brokers: ['127.0.0.1:9092'],
        });
        const consumer = kafka.consumer({ groupId: 'runtime-messaging-redpanda-poc' });

        expect(consumer.run).toBeTypeOf('function');
        expect(consumer.commitOffsets).toBeTypeOf('function');
        expect(consumer.pause).toBeTypeOf('function');
        expect(consumer.resume).toBeTypeOf('function');
    });

    it('uses standard Confluent framing and schema lookup by id without registration', async () => {
        await withSchemaRegistryStub(async (host, requests) => {
            const writerRegistry = new SchemaRegistry({ host });
            const value = await writerRegistry.encode(SCHEMA_ID, { message: 'hello' });

            expect(value[0]).toBe(0);
            expect(value.readUInt32BE(1)).toBe(SCHEMA_ID);

            const readerRegistry = new SchemaRegistry({ host });
            await expect(readerRegistry.decode(value)).resolves.toEqual({ message: 'hello' });

            expect(requests).toEqual([
                { method: 'GET', url: `/schemas/ids/${SCHEMA_ID}` },
                { method: 'GET', url: `/schemas/ids/${SCHEMA_ID}` },
            ]);
            expect(requests.every((request) => request.method === 'GET')).toBe(true);
        });
    });
});
