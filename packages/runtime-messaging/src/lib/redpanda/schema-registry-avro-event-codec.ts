import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

import {
    getEventValueSubject,
    renderEventPayloadAvroSchema,
    toSchemaRegistryAvroSchema,
    type AvroEventContract,
} from './event-avro-schema.js';

const CONFLUENT_WIRE_HEADER_BYTES = 5;
const CONFLUENT_WIRE_MAGIC_BYTE = 0;
const CONFLUENT_SCHEMA_ID_OFFSET = 1;

export type SchemaRegistryConnectionOptions = ConstructorParameters<typeof SchemaRegistry>[0];
export type SchemaRegistryAvroCodecClient = Pick<
    SchemaRegistry,
    'getRegistryIdBySchema' | 'getSchema' | 'encode' | 'decode'
>;

export class InvalidAvroEventPayloadError extends Error {
    public constructor(cause: unknown) {
        super('Schema Registry Avro event payload could not be decoded.', { cause });
        this.name = 'InvalidAvroEventPayloadError';
    }
}

export class SchemaRegistryAvroEventCodec {
    private readonly registry: SchemaRegistryAvroCodecClient;
    private readonly schemaIds = new Map<string, Promise<number>>();

    public constructor(
        options: SchemaRegistryConnectionOptions,
        registry: SchemaRegistryAvroCodecClient = new SchemaRegistry(options),
    ) {
        this.registry = registry;
    }

    public async encode(contract: AvroEventContract, payload: unknown): Promise<Buffer> {
        const parsedPayload = contract.payload.parse(payload);
        const schemaId = await this.resolveSchemaId(contract);

        return this.registry.encode(schemaId, parsedPayload);
    }

    public async decode(value: Buffer): Promise<unknown> {
        if (!hasValidConfluentWireHeader(value)) {
            return this.registry.decode(value);
        }

        const schemaId = value.readInt32BE(CONFLUENT_SCHEMA_ID_OFFSET);
        await this.registry.getSchema(schemaId);

        try {
            return await this.registry.decode(value);
        } catch (error: unknown) {
            throw new InvalidAvroEventPayloadError(error);
        }
    }

    private resolveSchemaId(contract: AvroEventContract): Promise<number> {
        const subject = getEventValueSubject(contract.name);
        const schema = toSchemaRegistryAvroSchema(renderEventPayloadAvroSchema(contract));
        const cacheKey = `${subject}\n${JSON.stringify(schema)}`;
        const cached = this.schemaIds.get(cacheKey);

        if (cached !== undefined) {
            return cached;
        }

        const lookup = this.registry.getRegistryIdBySchema(subject, schema).catch((error: unknown) => {
            this.schemaIds.delete(cacheKey);
            throw error;
        });
        this.schemaIds.set(cacheKey, lookup);

        return lookup;
    }
}

function hasValidConfluentWireHeader(value: Buffer): boolean {
    return value.length >= CONFLUENT_WIRE_HEADER_BYTES && value[0] === CONFLUENT_WIRE_MAGIC_BYTE;
}
