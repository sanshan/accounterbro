import type { DocumentId, DocumentProcessingId } from '@accounterbro/core';
import type { Event } from '@event-driven-platform/event';

import { documentProcessingEventNames } from '../names.js';

export interface DocumentProcessingCompletedPayload {
    readonly processingId: DocumentProcessingId;
    readonly documentId: DocumentId;
}

export class DocumentProcessingCompletedEvent
    implements
        Event<
            typeof documentProcessingEventNames.completed,
            1,
            DocumentProcessingCompletedPayload
        >
{
    public readonly name = documentProcessingEventNames.completed;
    public readonly schemaVersion = 1 as const;

    public constructor(public readonly payload: DocumentProcessingCompletedPayload) {}
}
