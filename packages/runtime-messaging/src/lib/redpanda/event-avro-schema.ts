import {
    renderEventContractAvroSchema,
    type AvroRecordSchema,
} from '@event-driven-platform/event-schema-avro';

import { getEventAvroRenderOptions, getEventAvroRecordName } from './avro-naming.js';

export type AvroEventContract = Parameters<typeof renderEventContractAvroSchema>[0];

export function getEventValueSubject(eventName: string): string {
    getEventAvroRecordName(eventName);

    return `${eventName}-value`;
}

export function renderEventPayloadAvroSchema(contract: AvroEventContract): AvroRecordSchema {
    return renderEventContractAvroSchema(contract, getEventAvroRenderOptions(contract.name));
}

export function toSchemaRegistryAvroSchema(schema: AvroRecordSchema) {
    return {
        ...schema,
        fields: [...schema.fields],
    };
}
