import { TextDecoder } from 'node:util';

import type { AnyEventEnvelope } from '@event-driven-platform/event';

import type { EventValidationResult } from '../event-validation.js';
import { validateEventEnvelope } from '../validate-event-envelope.js';

export const EVENT_ENVELOPE_HEADER = 'ab.event-envelope';
export const EVENT_ENVELOPE_WIRE_VERSION = 1 as const;

type EventEnvelopeWireFields =
    | 'eventId'
    | 'eventName'
    | 'schemaVersion'
    | 'occurredAt'
    | 'intentId'
    | 'correlationId'
    | 'operationName'
    | 'tenant'
    | 'actor'
    | 'subject'
    | 'aggregate';

export type EventEnvelopeWireMetadataV1 = Pick<AnyEventEnvelope, EventEnvelopeWireFields> & {
    readonly wireVersion: typeof EVENT_ENVELOPE_WIRE_VERSION;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class EventEnvelopeWireError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EventEnvelopeWireError';
    }
}

function toEventEnvelopeWireMetadata(
    envelope: AnyEventEnvelope,
): EventEnvelopeWireMetadataV1 {
    return {
        wireVersion: EVENT_ENVELOPE_WIRE_VERSION,
        eventId: envelope.eventId,
        eventName: envelope.eventName,
        schemaVersion: envelope.schemaVersion,
        occurredAt: envelope.occurredAt,
        intentId: envelope.intentId,
        correlationId: envelope.correlationId,
        operationName: envelope.operationName,
        tenant: envelope.tenant,
        actor: envelope.actor,
        subject: envelope.subject,
        aggregate: envelope.aggregate,
    };
}

function stringifyEventEnvelopeMetadata(metadata: EventEnvelopeWireMetadataV1): string {
    const encoded = JSON.stringify(metadata);

    if (encoded === undefined) {
        throw new EventEnvelopeWireError(
            `Header ${EVENT_ENVELOPE_HEADER} metadata could not be serialized.`,
        );
    }

    return encoded;
}

export function encodeEventEnvelopeHeader(envelope: AnyEventEnvelope): Buffer {
    return Buffer.from(
        stringifyEventEnvelopeMetadata(toEventEnvelopeWireMetadata(envelope)),
        'utf8',
    );
}

export function reconstructEventEnvelope(
    headerValue: unknown,
    payload: unknown,
): EventValidationResult<AnyEventEnvelope> {
    const header = parseEventEnvelopeHeader(headerValue);

    return validateEventEnvelope({
        eventId: header.eventId,
        eventName: header.eventName,
        schemaVersion: header.schemaVersion,
        occurredAt: header.occurredAt,
        intentId: header.intentId,
        correlationId: header.correlationId,
        operationName: header.operationName,
        tenant: header.tenant,
        actor: header.actor,
        subject: header.subject,
        aggregate: header.aggregate,
        payload,
    });
}

function parseEventEnvelopeHeader(headerValue: unknown): EventEnvelopeWireMetadataV1 {
    let encodedHeader: string;

    if (Buffer.isBuffer(headerValue)) {
        try {
            encodedHeader = new TextDecoder('utf-8', { fatal: true }).decode(headerValue);
        } catch {
            throw new EventEnvelopeWireError(
                `Header ${EVENT_ENVELOPE_HEADER} must contain valid UTF-8.`,
            );
        }
    } else if (typeof headerValue === 'string') {
        encodedHeader = headerValue;
    } else {
        throw new EventEnvelopeWireError(
            `Header ${EVENT_ENVELOPE_HEADER} must be a UTF-8 string or Buffer.`,
        );
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(encodedHeader) as unknown;
    } catch {
        throw new EventEnvelopeWireError(`Header ${EVENT_ENVELOPE_HEADER} must contain valid JSON.`);
    }

    if (!isRecord(parsed)) {
        throw new EventEnvelopeWireError(`Header ${EVENT_ENVELOPE_HEADER} must contain an object.`);
    }

    if (parsed['wireVersion'] !== EVENT_ENVELOPE_WIRE_VERSION) {
        throw new EventEnvelopeWireError(
            `Header ${EVENT_ENVELOPE_HEADER} has an unsupported wireVersion.`,
        );
    }

    if (Object.prototype.hasOwnProperty.call(parsed, 'payload')) {
        throw new EventEnvelopeWireError(
            `Header ${EVENT_ENVELOPE_HEADER} must not contain business payload.`,
        );
    }

    return parsed as EventEnvelopeWireMetadataV1;
}
