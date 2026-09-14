export const EVENT_AVRO_NAMESPACE = 'accounterbro.events';

const EVENT_AVRO_RECORD_PREFIX = 'EventPayload_';

export function getEventAvroRecordName(eventName: string): string {
    if (eventName.length === 0) {
        throw new TypeError('Event name must not be empty.');
    }

    return `${EVENT_AVRO_RECORD_PREFIX}${Buffer.from(eventName, 'utf8').toString('hex')}`;
}

export function getEventAvroRenderOptions(eventName: string): {
    readonly recordName: string;
    readonly namespace: typeof EVENT_AVRO_NAMESPACE;
} {
    return {
        recordName: getEventAvroRecordName(eventName),
        namespace: EVENT_AVRO_NAMESPACE,
    };
}
