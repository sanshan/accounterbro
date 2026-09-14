import { COMPATIBILITY, SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import {
    ConfigResourceTypes,
    Kafka,
    type IResourceConfigEntry,
    type KafkaConfig,
} from 'kafkajs';
import type { ZodType } from 'zod';

import {
    getEventValueSubject,
    renderEventPayloadAvroSchema,
    toSchemaRegistryAvroSchema,
    type AvroEventContract,
} from './event-avro-schema.js';
import type { SchemaRegistryConnectionOptions } from './schema-registry-avro-event-codec.js';

export const REDPANDA_VALUE_SCHEMA_ID_VALIDATION_CONFIG = 'redpanda.value.schema.id.validation';
export const REDPANDA_VALUE_SUBJECT_NAME_STRATEGY_CONFIG =
    'redpanda.value.subject.name.strategy';
export const REDPANDA_TOPIC_NAME_STRATEGY = 'TopicNameStrategy';

export interface EventSchemaProvisioningOptions<
    TName extends string,
    TSchemaVersion extends number,
    TPayloadSchema extends ZodType,
> {
    readonly contract: AvroEventContract<TName, TSchemaVersion, TPayloadSchema>;
    readonly schemaRegistry: SchemaRegistryConnectionOptions;
}

export interface EventSchemaProvisioningResult {
    readonly subject: string;
    readonly schemaId: number;
}

export interface ManagedEventTopicProvisioningOptions<
    TName extends string,
    TSchemaVersion extends number,
    TPayloadSchema extends ZodType,
> extends EventSchemaProvisioningOptions<TName, TSchemaVersion, TPayloadSchema> {
    readonly kafka: KafkaConfig;
    readonly numPartitions: number;
    readonly replicationFactor?: number;
}

export interface ManagedEventTopicProvisioningResult extends EventSchemaProvisioningResult {
    readonly topic: string;
}

export function getManagedEventTopicConfigEntries(): IResourceConfigEntry[] {
    return [
        {
            name: REDPANDA_VALUE_SCHEMA_ID_VALIDATION_CONFIG,
            value: 'true',
        },
        {
            name: REDPANDA_VALUE_SUBJECT_NAME_STRATEGY_CONFIG,
            value: REDPANDA_TOPIC_NAME_STRATEGY,
        },
    ];
}

export async function provisionEventContractSchema<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends ZodType,
>(
    options: EventSchemaProvisioningOptions<TName, TSchemaVersion, TPayloadSchema>,
): Promise<EventSchemaProvisioningResult> {
    const registry = new SchemaRegistry(options.schemaRegistry);
    const subject = getEventValueSubject(options.contract.name);
    const schema = toSchemaRegistryAvroSchema(renderEventPayloadAvroSchema(options.contract));
    const registered = await registry.register(schema, {
        subject,
        compatibility: COMPATIBILITY.BACKWARD_TRANSITIVE,
        updateConfig: true,
    });

    return {
        subject,
        schemaId: registered.id,
    };
}

export async function provisionManagedEventTopic<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends ZodType,
>(
    options: ManagedEventTopicProvisioningOptions<TName, TSchemaVersion, TPayloadSchema>,
): Promise<ManagedEventTopicProvisioningResult> {
    assertPositiveInteger(options.numPartitions, 'numPartitions');
    if (options.replicationFactor !== undefined) {
        assertPositiveInteger(options.replicationFactor, 'replicationFactor');
    }

    const schema = await provisionEventContractSchema(options);
    const topic = options.contract.name;
    const configEntries = getManagedEventTopicConfigEntries();
    const admin = new Kafka(options.kafka).admin();

    await admin.connect();
    try {
        await admin.createTopics({
            waitForLeaders: true,
            topics: [
                {
                    topic,
                    numPartitions: options.numPartitions,
                    ...(options.replicationFactor === undefined
                        ? {}
                        : { replicationFactor: options.replicationFactor }),
                    configEntries,
                },
            ],
        });
        await admin.alterConfigs({
            validateOnly: false,
            resources: [
                {
                    type: ConfigResourceTypes.TOPIC,
                    name: topic,
                    configEntries,
                },
            ],
        });
    } finally {
        await admin.disconnect();
    }

    return {
        topic,
        ...schema,
    };
}

function assertPositiveInteger(value: number, name: string): void {
    if (!Number.isInteger(value) || value <= 0) {
        throw new TypeError(`${name} must be a positive integer.`);
    }
}
