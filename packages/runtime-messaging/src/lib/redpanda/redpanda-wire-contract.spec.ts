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
    it('uses a stable Avro name derived only from EventContract.name', () => {
        expect(getEventAvroRenderOptions('documents.registered')).toEqual({
            recordName: 'EventPayload_646f63756d656e74732e72656769737465726564',
            namespace: EVENT_AVRO_NAMESPACE,
        });
        expect(getEventAvroRecordName('documents.registered')).toBe(
            getEventAvroRecordName('documents.registered'),
        );
        expect(getEventAvroRecordName('documents-registered')).not.toBe(
            getEventAvroRecordName('documents.registered'),
        );
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
