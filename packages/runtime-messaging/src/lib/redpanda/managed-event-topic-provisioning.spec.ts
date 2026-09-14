import { describe, expect, it } from 'vitest';

import { getEventValueSubject } from './event-avro-schema.js';
import {
    getManagedEventTopicConfigEntries,
    REDPANDA_TOPIC_NAME_STRATEGY,
    REDPANDA_VALUE_SCHEMA_ID_VALIDATION_CONFIG,
    REDPANDA_VALUE_SUBJECT_NAME_STRATEGY_CONFIG,
} from './managed-event-topic-provisioning.js';

describe('managed Redpanda Event topic provisioning contract', () => {
    it('uses TopicNameStrategy value subjects derived from the Event topic name', () => {
        expect(getEventValueSubject('documents.registered')).toBe('documents.registered-value');
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
});
