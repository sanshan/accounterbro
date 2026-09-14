import { TextDecoder } from 'node:util';

import type { AnyEventEnvelope } from '@event-driven-platform/event';

import type { EventValidationResult } from '../event-validation.js';
import { validateEventEnvelope } from '../validate-event-envelope.js';

export const EVENT_ENVELOPE_HEADER = 'ab.event-envelope';
export const EVENT_ENVELOPE_WIRE_VERSION = 1 as const;

export type EventEnvelopeWireMetadataV1 = Omit<AnyEventEnvelope, 'payload'> & {
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

function toEventEnvelopeWireMetadata({
    payload: _payload,
    ...metadata
}: AnyEventEnvelope): EventEnvelopeWireMetadataV1 {
    return {
        ...metadata,
        wireVersion: EVENT_ENVELOPE_WIRE_VERSION,
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
    const { wireVersion: _wireVersion, ...metadata } = parseEventEnvelopeHeader(headerValue);

    return validateEventEnvelope({
        ...metadata,
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
