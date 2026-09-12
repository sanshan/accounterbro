import {
    defineEventContract,
    type EventOf,
    type EventPayloadOf,
} from '@event-driven-platform/event';
import { z } from 'zod';

import { documentEventNames } from '../names.js';

export const DocumentRegisteredEventContract = defineEventContract({
    name: documentEventNames.registered,
    schemaVersion: 1,
    payload: z.object({
        documentId: z.string(),
        storageReference: z.string(),
    }),
});

export type DocumentRegisteredPayload = EventPayloadOf<typeof DocumentRegisteredEventContract>;
export type DocumentRegisteredEvent = EventOf<typeof DocumentRegisteredEventContract>;
