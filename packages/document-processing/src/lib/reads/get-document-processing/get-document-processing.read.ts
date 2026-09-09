import type { DocumentId, DocumentProcessingId, TenantReference } from '@accounterbro/core';
import type { Read } from '@event-driven-platform/read';

import type { DocumentProcessingStatus } from '../../document-processing/document-processing-status.js';
import type { documentProcessingReadNames } from '../names.js';

export interface GetDocumentProcessingParameters {
    readonly documentId: DocumentId;
}

export interface GetDocumentProcessingResult {
    readonly id: DocumentProcessingId;
    readonly documentId: DocumentId;
    readonly status: DocumentProcessingStatus;
    readonly extractedText?: string;
    readonly failureReason?: string;
}

export type GetDocumentProcessingRead = Read<
    typeof documentProcessingReadNames.getDocumentProcessing,
    TenantReference,
    GetDocumentProcessingParameters,
    GetDocumentProcessingResult | null
>;
