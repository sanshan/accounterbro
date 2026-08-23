import type { Read } from '@event-driven-platform/read';

import type { DocumentRegistrationStatus } from '../document.js';
import type { GET_DOCUMENT_READ } from './document-read-names.js';

export interface GetDocumentParameters {
    readonly documentId: string;
}

export interface GetDocumentResult {
    readonly id: string;
    readonly status: DocumentRegistrationStatus;
}

export type GetDocumentRead = Read<
    typeof GET_DOCUMENT_READ,
    GetDocumentParameters,
    GetDocumentResult | null
>;
