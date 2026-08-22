import type { Event } from '@event-driven-platform/event';

export const DOCUMENT_UPLOAD_REQUESTED_EVENT = 'documents.upload-requested' as const;

export interface DocumentUploadRequestedPayload {
    readonly documentId: string;
}

export type DocumentUploadRequested = Event<
    typeof DOCUMENT_UPLOAD_REQUESTED_EVENT,
    1,
    DocumentUploadRequestedPayload
>;
