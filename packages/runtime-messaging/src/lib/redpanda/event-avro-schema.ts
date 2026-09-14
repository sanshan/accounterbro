import type { EventContract } from '@event-driven-platform/event';
import {
    renderEventContractAvroSchema,
    type AvroRecordSchema,
} from '@event-driven-platform/event-schema-avro';
import type { ZodType } from 'zod';

import { getEventAvroRenderOptions, getEventAvroRecordName } from './avro-naming.js';

export type AvroEventContract<
    TName extends string,
    TSchemaVersion extends number,
    TPayloadSchema extends ZodType,
> = EventContract<TName, TSchemaVersion, TPayloadSchema>;

export function getEventValueSubject(eventName: string): string {
    getEventAvroRecordName(eventName);

    return `${eventName}-value`;
}

export function renderEventPayloadAvroSchema<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends ZodType,
>(contract: AvroEventContract<TName, TSchemaVersion, TPayloadSchema>): AvroRecordSchema {
    return renderEventContractAvroSchema(contract, getEventAvroRenderOptions(contract.name));
}

export function toSchemaRegistryAvroSchema(schema: AvroRecordSchema) {
    return {
        ...schema,
        fields: [...schema.fields],
    };
}
