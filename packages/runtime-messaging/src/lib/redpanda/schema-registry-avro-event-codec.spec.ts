import { defineEventContract } from '@event-driven-platform/event';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { getEventValueSubject, renderEventPayloadAvroSchema } from './event-avro-schema.js';
import {
    provisionEventContractSchema,
    type SchemaRegistrySchemaProvisioningClient,
} from './managed-event-topic-provisioning.js';
import {
    InvalidAvroEventPayloadError,
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
const ENCODED_VALUE = Buffer.from([0, 0, 0, 0, SCHEMA_ID, 1, 2]);
const UNUSED_REGISTRY_CONNECTION = { host: 'http://schema-registry.invalid' };
const REGISTRY_SCHEMA = {
    toBuffer() {
        return Buffer.alloc(0);
    },
    fromBuffer() {
        return {};
    },
    isValid() {
        return true;
    },
};

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
        let decodedSchemaId: number | undefined;
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
            async getSchema(schemaId) {
                decodedSchemaId = schemaId;
                return REGISTRY_SCHEMA;
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
        expect(decodedSchemaId).toBe(SCHEMA_ID);
        expect(decodedValue).toEqual(ENCODED_VALUE);
        expect(registrationCount).toBe(1);
    });

    it('preserves Schema Registry lookup failures without classifying the record as invalid', async () => {
        const registryFailure = new Error('schema registry unavailable');
        let decodeCount = 0;
        const registryClient: SchemaRegistryAvroCodecClient = {
            async getRegistryIdBySchema() {
                return SCHEMA_ID;
            },
            async getSchema() {
                throw registryFailure;
            },
            async encode() {
                return ENCODED_VALUE;
            },
            async decode() {
                decodeCount += 1;
                return {};
            },
        };
        const codec = new SchemaRegistryAvroEventCodec(
            UNUSED_REGISTRY_CONNECTION,
            registryClient,
        );

        await expect(codec.decode(ENCODED_VALUE)).rejects.toBe(registryFailure);
        expect(decodeCount).toBe(0);
    });

    it('marks decode failures as invalid only after the writer schema is available', async () => {
        const decodeFailure = new Error('truncated Avro payload');
        const registryClient: SchemaRegistryAvroCodecClient = {
            async getRegistryIdBySchema() {
                return SCHEMA_ID;
            },
            async getSchema() {
                return REGISTRY_SCHEMA;
            },
            async encode() {
                return ENCODED_VALUE;
            },
            async decode() {
                throw decodeFailure;
            },
        };
        const codec = new SchemaRegistryAvroEventCodec(
            UNUSED_REGISTRY_CONNECTION,
            registryClient,
        );

        await expect(codec.decode(ENCODED_VALUE)).rejects.toMatchObject({
            name: 'InvalidAvroEventPayloadError',
            cause: decodeFailure,
        });
        await expect(codec.decode(ENCODED_VALUE)).rejects.toBeInstanceOf(InvalidAvroEventPayloadError);
    });
});
