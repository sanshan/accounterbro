import type { DocumentId } from '@accounterbro/core';
import type { Read } from '@event-driven-platform/read';

import type { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import type { documentReadNames } from '../names.js';

export interface GetDocumentParameters {
    readonly documentId: DocumentId;
}

export interface GetDocumentResult {
    readonly id: DocumentId;
    readonly status: DocumentRegistrationStatus;
}

export type GetDocumentRead = Read<
    typeof documentReadNames.getDocument,
    GetDocumentParameters,
    GetDocumentResult | null
>;
