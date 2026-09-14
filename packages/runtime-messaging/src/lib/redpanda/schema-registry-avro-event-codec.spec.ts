import { defineEventContract } from '@event-driven-platform/event';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { getEventValueSubject, renderEventPayloadAvroSchema } from './event-avro-schema.js';
import {
    provisionEventContractSchema,
    type SchemaRegistrySchemaProvisioningClient,
} from './managed-event-topic-provisioning.js';
import {
    SchemaRegistryAvroEventCodec,
    type SchemaRegistryAvroCodecClient,
} from './schema-registry-avro-event-codec.js';

const TEST_EVENT_CONTRACT = defineEventContract({
    name: 'test.event',
    schemaVersion: 1,
    payload: z.object({
        id: z.string(),
        message: z.string(),
    }),
});

const SCHEMA_ID = 17;
const SUBJECT = 'test.event-value';
const ENCODED_VALUE = Buffer.from('registry-framed-value-fixture');
const UNUSED_REGISTRY_CONNECTION = { host: 'http://schema-registry.invalid' };

describe('Schema Registry Avro Event boundary', () => {
    it('derives the EDP schema, provisions it explicitly, and keeps runtime codec lookup read-only', async () => {
        const expectedSchema = renderEventPayloadAvroSchema(TEST_EVENT_CONTRACT);
        const payload = {
            id: 'event-1',
            message: 'hello',
        };

        let registrationCount = 0;
        let registeredSchema: unknown;
        let registrationOptions: unknown;
        let lookupCount = 0;
        let lookupSubject: string | undefined;
        let lookupSchema: unknown;
        const encodedPayloads: unknown[] = [];
        let decodedValue: Buffer | undefined;

        const registryClient: SchemaRegistryAvroCodecClient & SchemaRegistrySchemaProvisioningClient = {
            async register(schema, options) {
                registrationCount += 1;
                registeredSchema = schema;
                registrationOptions = options;
                return { id: SCHEMA_ID };
            },
            async getRegistryIdBySchema(subject, schema) {
                lookupCount += 1;
                lookupSubject = subject;
                lookupSchema = schema;
                return SCHEMA_ID;
            },
            async encode(schemaId, value) {
                expect(schemaId).toBe(SCHEMA_ID);
                encodedPayloads.push(value);
                return ENCODED_VALUE;
            },
            async decode(value) {
                decodedValue = value;
                return payload;
            },
        };

        const provisioned = await provisionEventContractSchema(
            {
                contract: TEST_EVENT_CONTRACT,
                schemaRegistry: UNUSED_REGISTRY_CONNECTION,
            },
            registryClient,
        );

        expect(getEventValueSubject(TEST_EVENT_CONTRACT.name)).toBe(SUBJECT);
        expect(provisioned).toEqual({ subject: SUBJECT, schemaId: SCHEMA_ID });
        expect(registeredSchema).toEqual(expectedSchema);
        expect(registrationOptions).toEqual({
            subject: SUBJECT,
            compatibility: 'BACKWARD_TRANSITIVE',
            updateConfig: true,
        });

        const codec = new SchemaRegistryAvroEventCodec(
            UNUSED_REGISTRY_CONNECTION,
            registryClient,
        );

        await expect(codec.encode(TEST_EVENT_CONTRACT, payload)).resolves.toEqual(ENCODED_VALUE);
        await expect(codec.encode(TEST_EVENT_CONTRACT, payload)).resolves.toEqual(ENCODED_VALUE);

        expect(lookupCount).toBe(1);
        expect(lookupSubject).toBe(SUBJECT);
        expect(lookupSchema).toEqual(expectedSchema);
        expect(encodedPayloads).toEqual([payload, payload]);

        await expect(codec.decode(ENCODED_VALUE)).resolves.toEqual(payload);
        expect(decodedValue).toEqual(ENCODED_VALUE);
        expect(registrationCount).toBe(1);
    });
});
