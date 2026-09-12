import {
    defineEventContract,
    type EventOf,
    type EventPayloadOf,
} from '@event-driven-platform/event';
import { z } from 'zod';

import { documentProcessingEventNames } from '../names.js';

export const DocumentProcessingCompletedEventContract = defineEventContract({
    name: documentProcessingEventNames.completed,
    schemaVersion: 1,
    payload: z.object({
        processingId: z.string(),
        documentId: z.string(),
    }),
});

export type DocumentProcessingCompletedPayload = EventPayloadOf<
    typeof DocumentProcessingCompletedEventContract
>;
export type DocumentProcessingCompletedEvent = EventOf<
    typeof DocumentProcessingCompletedEventContract
>;
