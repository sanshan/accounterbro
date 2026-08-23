import type { DocumentId } from '@accounterbro/core';
import type { Event } from '@event-driven-platform/event';

import { documentEventNames } from '../names.js';

export interface DocumentUploadRequestedPayload {
    readonly documentId: DocumentId;
}

export class DocumentUploadRequestedEvent
    implements Event<typeof documentEventNames.uploadRequested, 1, DocumentUploadRequestedPayload>
{
    public readonly name = documentEventNames.uploadRequested;
    public readonly schemaVersion = 1 as const;

    public constructor(public readonly payload: DocumentUploadRequestedPayload) {}
}
