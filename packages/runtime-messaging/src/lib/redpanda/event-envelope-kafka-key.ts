import type { AnyEventEnvelope } from '@event-driven-platform/event';

export function encodeEventEnvelopeKafkaKey(envelope: AnyEventEnvelope): Buffer {
    return Buffer.from(
        JSON.stringify([envelope.aggregate.type, envelope.aggregate.id]),
        'utf8',
    );
}
