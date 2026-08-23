import type { DocumentId } from '@accounterbro/core';
import type { Event } from '@event-driven-platform/event';

import { documentEventNames } from '../names.js';

export interface DocumentRegisteredPayload {
    readonly documentId: DocumentId;
    readonly storageReference: string;
}

export class DocumentRegisteredEvent
    implements Event<typeof documentEventNames.registered, 1, DocumentRegisteredPayload>
{
    public readonly name = documentEventNames.registered;
    public readonly schemaVersion = 1 as const;

    public constructor(public readonly payload: DocumentRegisteredPayload) {}
}
