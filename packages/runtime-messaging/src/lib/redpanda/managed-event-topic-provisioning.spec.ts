import { ConfigSource, type ConfigEntries } from 'kafkajs';
import { describe, expect, it } from 'vitest';

import { getEventValueSubject } from './event-avro-schema.js';
import {
    buildSafeManagedEventTopicAlterConfigEntries,
    getManagedEventTopicConfigEntries,
    getManagedEventTopicPartitionIncrease,
    REDPANDA_TOPIC_NAME_STRATEGY,
    REDPANDA_VALUE_SCHEMA_ID_VALIDATION_CONFIG,
    REDPANDA_VALUE_SUBJECT_NAME_STRATEGY_CONFIG,
} from './managed-event-topic-provisioning.js';

function topicConfigEntry(
    overrides: Partial<ConfigEntries> & Pick<ConfigEntries, 'configName' | 'configValue'>,
): ConfigEntries {
    return {
        configName: overrides.configName,
        configValue: overrides.configValue,
        isDefault: overrides.isDefault ?? false,
        configSource: overrides.configSource ?? ConfigSource.TOPIC_CONFIG,
        isSensitive: overrides.isSensitive ?? false,
        readOnly: overrides.readOnly ?? false,
        configSynonyms: overrides.configSynonyms ?? [],
    };
}

describe('managed Redpanda Event topic provisioning contract', () => {
    it('uses TopicNameStrategy value subjects derived from the Event topic name', () => {
        expect(getEventValueSubject('document.registration-finished')).toBe(
            'document.registration-finished-value',
        );
        expect(() => getEventValueSubject('documents_registered')).toThrow(TypeError);
    });

    it('enables server-side value schema id validation with TopicNameStrategy', () => {
        expect(getManagedEventTopicConfigEntries()).toEqual([
            {
                name: REDPANDA_VALUE_SCHEMA_ID_VALIDATION_CONFIG,
                value: 'true',
            },
            {
                name: REDPANDA_VALUE_SUBJECT_NAME_STRATEGY_CONFIG,
                value: REDPANDA_TOPIC_NAME_STRATEGY,
            },
        ]);
    });

    it('preserves only existing topic-level overrides when AlterConfigs is required', () => {
        expect(
            buildSafeManagedEventTopicAlterConfigEntries([
                topicConfigEntry({ configName: 'retention.ms', configValue: '86400000' }),
                topicConfigEntry({ configName: 'cleanup.policy', configValue: 'compact' }),
                topicConfigEntry({
                    configName: REDPANDA_VALUE_SCHEMA_ID_VALIDATION_CONFIG,
                    configValue: 'false',
                }),
                topicConfigEntry({
                    configName: 'compression.type',
                    configValue: 'producer',
                    configSource: ConfigSource.DYNAMIC_DEFAULT_BROKER_CONFIG,
                }),
                topicConfigEntry({
                    configName: 'min.insync.replicas',
                    configValue: '2',
                    configSource: ConfigSource.STATIC_BROKER_CONFIG,
                }),
                topicConfigEntry({
                    configName: 'default.config',
                    configValue: 'ignored',
                    isDefault: true,
                    configSource: ConfigSource.DEFAULT_CONFIG,
                }),
                topicConfigEntry({
                    configName: 'read.only.config',
                    configValue: 'ignored',
                    readOnly: true,
                }),
            ]),
        ).toEqual([
            { name: 'cleanup.policy', value: 'compact' },
            {
                name: REDPANDA_VALUE_SCHEMA_ID_VALIDATION_CONFIG,
                value: 'true',
            },
            {
                name: REDPANDA_VALUE_SUBJECT_NAME_STRATEGY_CONFIG,
                value: REDPANDA_TOPIC_NAME_STRATEGY,
            },
            { name: 'retention.ms', value: '86400000' },
        ]);
    });

    it('fails instead of resetting a topic-level config whose value cannot be preserved', () => {
        expect(() =>
            buildSafeManagedEventTopicAlterConfigEntries([
                topicConfigEntry({
                    configName: 'sensitive.config',
                    configValue: '',
                    isSensitive: true,
                }),
            ]),
        ).toThrow('Cannot safely preserve existing topic-level config "sensitive.config"');
    });

    it('keeps the partition count when the existing topic already matches', () => {
        expect(getManagedEventTopicPartitionIncrease('test.event', 3, 3)).toBeUndefined();
    });

    it('requests an increase when the existing topic has fewer partitions', () => {
        expect(getManagedEventTopicPartitionIncrease('test.event', 2, 4)).toBe(4);
    });

    it('rejects a requested partition decrease', () => {
        expect(() => getManagedEventTopicPartitionIncrease('test.event', 4, 2)).toThrow(
            'Existing topic "test.event" has 4 partitions, which exceeds requested 2; Kafka partitions cannot be decreased.',
        );
    });
});
