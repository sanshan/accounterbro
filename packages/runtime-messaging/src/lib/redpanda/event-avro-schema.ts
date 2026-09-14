import {
    renderEventContractAvroSchema,
    type AvroRecordSchema,
} from '@event-driven-platform/event-schema-avro';

import { getEventAvroRenderOptions, getEventAvroRecordName } from './avro-naming.js';

export interface AvroEventContract {
    readonly name: string;
    readonly schemaVersion: number;
    readonly payload: {
        parse(value: unknown): unknown;
    };
}

type RendererEventContract = Parameters<typeof renderEventContractAvroSchema>[0];

export function getEventValueSubject(eventName: string): string {
    getEventAvroRecordName(eventName);

    return `${eventName}-value`;
}

export function renderEventPayloadAvroSchema(contract: AvroEventContract): AvroRecordSchema {
    // Published EDP packages can resolve patch-different Zod copies. EventContract is
    // structurally the same runtime contract; normalize that package-local type identity
    // only at the renderer boundary instead of leaking Zod into transport APIs.
    const rendererContract = contract as unknown as RendererEventContract;

    return renderEventContractAvroSchema(
        rendererContract,
        getEventAvroRenderOptions(contract.name),
    );
}

export function toSchemaRegistryAvroSchema(schema: AvroRecordSchema) {
    return {
        ...schema,
        fields: [...schema.fields],
    };
}
