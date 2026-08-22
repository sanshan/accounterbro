import type { Event } from '@event-driven-platform/event';

export const DOCUMENT_REGISTERED_EVENT = 'documents.registered' as const;

export interface DocumentRegisteredPayload {
    readonly documentId: string;
    readonly storageReference: string;
}

export type DocumentRegistered = Event<
    typeof DOCUMENT_REGISTERED_EVENT,
    1,
    DocumentRegisteredPayload
>;
