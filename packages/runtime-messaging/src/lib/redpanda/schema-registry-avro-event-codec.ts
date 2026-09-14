import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

import {
    getEventValueSubject,
    renderEventPayloadAvroSchema,
    toSchemaRegistryAvroSchema,
    type AvroEventContract,
} from './event-avro-schema.js';

export type SchemaRegistryConnectionOptions = ConstructorParameters<typeof SchemaRegistry>[0];
export type SchemaRegistryAvroCodecClient = Pick<
    SchemaRegistry,
    'getRegistryIdBySchema' | 'encode' | 'decode'
>;

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
        return this.registry.decode(value);
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
