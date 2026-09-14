import { COMPATIBILITY, SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import {
    ConfigResourceTypes,
    Kafka,
    type ConfigEntries,
    type IResourceConfigEntry,
    type KafkaConfig,
} from 'kafkajs';

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

export interface EventSchemaProvisioningOptions {
    readonly contract: AvroEventContract;
    readonly schemaRegistry: SchemaRegistryConnectionOptions;
}

export interface EventSchemaProvisioningResult {
    readonly subject: string;
    readonly schemaId: number;
}

export interface ManagedEventTopicProvisioningOptions extends EventSchemaProvisioningOptions {
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

export function buildSafeManagedEventTopicAlterConfigEntries(
    existingConfigEntries: readonly ConfigEntries[],
): IResourceConfigEntry[] {
    const entries = new Map<string, string>();

    for (const entry of existingConfigEntries) {
        if (entry.isDefault || entry.readOnly) {
            continue;
        }

        if (entry.isSensitive || typeof entry.configValue !== 'string') {
            throw new Error(
                `Cannot safely preserve existing non-default topic config "${entry.configName}" while applying managed Event topic settings.`,
            );
        }

        entries.set(entry.configName, entry.configValue);
    }

    for (const entry of getManagedEventTopicConfigEntries()) {
        entries.set(entry.name, entry.value);
    }

    return [...entries.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => ({ name, value }));
}

export async function provisionEventContractSchema(
    options: EventSchemaProvisioningOptions,
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

export async function provisionManagedEventTopic(
    options: ManagedEventTopicProvisioningOptions,
): Promise<ManagedEventTopicProvisioningResult> {
    assertPositiveInteger(options.numPartitions, 'numPartitions');
    if (options.replicationFactor !== undefined) {
        assertPositiveInteger(options.replicationFactor, 'replicationFactor');
    }

    const schema = await provisionEventContractSchema(options);
    const topic = options.contract.name;
    const managedConfigEntries = getManagedEventTopicConfigEntries();
    const admin = new Kafka(options.kafka).admin();

    await admin.connect();
    try {
        const created = await admin.createTopics({
            waitForLeaders: true,
            topics: [
                {
                    topic,
                    numPartitions: options.numPartitions,
                    ...(options.replicationFactor === undefined
                        ? {}
                        : { replicationFactor: options.replicationFactor }),
                    configEntries: managedConfigEntries,
                },
            ],
        });

        if (!created) {
            const described = await admin.describeConfigs({
                includeSynonyms: false,
                resources: [
                    {
                        type: ConfigResourceTypes.TOPIC,
                        name: topic,
                    },
                ],
            });
            const resource = described.resources[0];

            if (resource === undefined || resource.errorCode !== 0) {
                throw new Error(
                    `Failed to describe existing topic config for "${topic}": ${resource?.errorMessage ?? 'missing response'}`,
                );
            }

            await admin.alterConfigs({
                validateOnly: false,
                resources: [
                    {
                        type: ConfigResourceTypes.TOPIC,
                        name: topic,
                        configEntries: buildSafeManagedEventTopicAlterConfigEntries(
                            resource.configEntries,
                        ),
                    },
                ],
            });
        }
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
