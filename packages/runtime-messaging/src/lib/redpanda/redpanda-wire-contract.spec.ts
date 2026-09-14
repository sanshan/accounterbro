import { describe, expect, it } from 'vitest';

import { createEventEnvelope } from '../testing/event-envelope.fixture.js';
import { validateEventEnvelope } from '../validate-event-envelope.js';
import {
    EVENT_AVRO_NAMESPACE,
    getEventAvroRenderOptions,
    getEventAvroRecordName,
} from './avro-naming.js';
import { encodeEventEnvelopeKafkaKey } from './event-envelope-kafka-key.js';
import {
    EVENT_ENVELOPE_HEADER,
    EVENT_ENVELOPE_WIRE_VERSION,
    EventEnvelopeWireError,
    encodeEventEnvelopeHeader,
    reconstructEventEnvelope,
} from './event-envelope-wire.js';

function validEnvelope(overrides: Record<string, unknown> = {}) {
    const result = validateEventEnvelope(createEventEnvelope(overrides));

    if (result.status !== 'valid') {
        throw new Error('Test fixture must produce a structurally valid EventEnvelope.');
    }

    return result.value;
}

describe('Redpanda wire contract', () => {
    it('uses a stable readable Avro name for the repository event-name convention', () => {
        expect(getEventAvroRenderOptions('document.registration-finished')).toEqual({
            recordName: 'EventPayload_document__registration_finished',
            namespace: EVENT_AVRO_NAMESPACE,
        });
        expect(getEventAvroRecordName('document-processing.completed')).toBe(
            'EventPayload_document_processing__completed',
        );
        expect(getEventAvroRecordName('a-b.c')).not.toBe(getEventAvroRecordName('a.b-c'));
    });

    it.each([
        '',
        'documents..registered',
        'documents_registered',
        'documents/registered',
        'документы.registered',
        'events.🚀',
    ])('rejects event names outside the simple ASCII dot-and-hyphen contract: %s', (eventName) => {
        expect(() => getEventAvroRecordName(eventName)).toThrow(TypeError);
    });

    it('encodes aggregate identity deterministically without inspecting business payload', () => {
        const first = validEnvelope({
            aggregate: { type: 'document', id: 'document:1' },
            payload: { ignored: 'first' },
        });
        const sameAggregate = validEnvelope({
            aggregate: { type: 'document', id: 'document:1' },
            payload: { ignored: 'second' },
        });
        const differentBoundary = validEnvelope({
            aggregate: { type: 'document:document', id: '1' },
        });

        expect(encodeEventEnvelopeKafkaKey(first)).toEqual(
            encodeEventEnvelopeKafkaKey(sameAggregate),
        );
        expect(encodeEventEnvelopeKafkaKey(first)).not.toEqual(
            encodeEventEnvelopeKafkaKey(differentBoundary),
        );
        expect(encodeEventEnvelopeKafkaKey(first).toString('utf8')).toBe(
            '["document","document:1"]',
        );
    });

    it('keeps business payload out of the metadata header and reconstructs a valid EDP envelope', () => {
        const payload = { documentId: 'document-1' };
        const envelope = validEnvelope({
            eventName: 'documents.registered',
            payload,
            producerExtension: { preserved: true },
        });

        const header = encodeEventEnvelopeHeader(envelope);
        const decodedHeader = JSON.parse(header.toString('utf8')) as Record<string, unknown>;

        expect(EVENT_ENVELOPE_HEADER).toBe('ab.event-envelope');
        expect(decodedHeader['wireVersion']).toBe(EVENT_ENVELOPE_WIRE_VERSION);
        expect(decodedHeader).not.toHaveProperty('payload');

        const reconstructed = reconstructEventEnvelope(header, payload);

        expect(reconstructed).toEqual({
            status: 'valid',
            value: envelope,
        });
    });

    it('rejects envelope metadata that collides with the reserved wireVersion field', () => {
        const envelope = validEnvelope({ wireVersion: 'producer-extension' });

        expect(() => encodeEventEnvelopeHeader(envelope)).toThrow(EventEnvelopeWireError);
    });

    it.each([NaN, Infinity, -Infinity])(
        'rejects non-finite metadata numbers before JSON serialization',
        (nonFinite) => {
            const envelope = validEnvelope({
                producerExtension: { nonFinite },
            });

            expect(() => encodeEventEnvelopeHeader(envelope)).toThrow(EventEnvelopeWireError);
        },
    );

    it.each([
        ['undefined', undefined],
        ['function', () => undefined],
        ['symbol', Symbol('metadata')],
        ['bigint', 1n],
        ['custom JSON serialization', new Date('2026-09-14T18:00:00.000Z')],
    ])('rejects %s metadata that JSON cannot preserve losslessly', (_case, unsupported) => {
        const envelope = validEnvelope({
            producerExtension: { unsupported },
        });

        expect(() => encodeEventEnvelopeHeader(envelope)).toThrow(EventEnvelopeWireError);
    });

    it('rejects invalid UTF-8 header bytes before JSON parsing', () => {
        const envelope = validEnvelope();
        const invalidHeader = Buffer.from(encodeEventEnvelopeHeader(envelope));
        const eventNameOffset = invalidHeader.indexOf(Buffer.from('test.event', 'utf8'));

        if (eventNameOffset < 0) {
            throw new Error('Expected fixture eventName in encoded header.');
        }

        invalidHeader[eventNameOffset] = 0xff;

        expect(() => reconstructEventEnvelope(invalidHeader, envelope.payload)).toThrow(
            EventEnvelopeWireError,
        );
    });

    it('leaves structural validation to the shared envelope validator after wire reconstruction', () => {
        const envelope = validEnvelope();
        const header = JSON.parse(encodeEventEnvelopeHeader(envelope).toString('utf8')) as Record<
            string,
            unknown
        >;
        header['schemaVersion'] = '1';

        const reconstructed = reconstructEventEnvelope(JSON.stringify(header), envelope.payload);

        expect(reconstructed).toMatchObject({
            status: 'invalid',
            failure: {
                kind: 'event-validation',
                issues: [{ path: ['schemaVersion'] }],
            },
        });
    });

    it.each([
        ['missing', undefined],
        ['malformed JSON', Buffer.from('{', 'utf8')],
        ['unsupported wire version', JSON.stringify({ wireVersion: 2 })],
        ['payload in metadata', JSON.stringify({ wireVersion: 1, payload: {} })],
    ])('rejects %s transport metadata before envelope validation', (_case, header) => {
        expect(() => reconstructEventEnvelope(header, {})).toThrow(EventEnvelopeWireError);
    });
});
