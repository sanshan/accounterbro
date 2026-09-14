export const EVENT_AVRO_NAMESPACE = 'accounterbro.events';

const EVENT_AVRO_RECORD_PREFIX = 'EventPayload_';
const EVENT_NAME_PATTERN = /^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/;

export function getEventAvroRecordName(eventName: string): string {
    if (!EVENT_NAME_PATTERN.test(eventName)) {
        throw new TypeError(
            'Event name must use ASCII alphanumeric words separated by dots or hyphens.',
        );
    }

    return `${EVENT_AVRO_RECORD_PREFIX}${eventName.replaceAll('-', '_').replaceAll('.', '__')}`;
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
