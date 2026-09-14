export const EVENT_AVRO_NAMESPACE = 'accounterbro.events';

const EVENT_AVRO_RECORD_PREFIX = 'EventPayload_';

function isWellFormedUnicode(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const codeUnit = value.charCodeAt(index);

        if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
            if (index + 1 >= value.length) {
                return false;
            }

            const nextCodeUnit = value.charCodeAt(index + 1);

            if (nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) {
                return false;
            }

            index += 1;
            continue;
        }

        if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
            return false;
        }
    }

    return true;
}

export function getEventAvroRecordName(eventName: string): string {
    if (eventName.length === 0) {
        throw new TypeError('Event name must not be empty.');
    }

    if (!isWellFormedUnicode(eventName)) {
        throw new TypeError('Event name must contain well-formed Unicode.');
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
