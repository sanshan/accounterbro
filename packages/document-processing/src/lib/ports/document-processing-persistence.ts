import type { DocumentId, DocumentProcessingId, TenantId } from '@accounterbro/core';

import type { DocumentProcessing } from '../document-processing/document-processing.aggregate.js';

export type CreateDocumentProcessingResult =
    | { readonly kind: 'created'; readonly processing: DocumentProcessing }
    | { readonly kind: 'existing'; readonly processing: DocumentProcessing };

export abstract class DocumentProcessingPersistence {
    public abstract createOrGetExisting(
        tenantId: TenantId,
        processing: DocumentProcessing,
    ): Promise<CreateDocumentProcessingResult>;
    public abstract findById(
        tenantId: TenantId,
        processingId: DocumentProcessingId,
    ): Promise<DocumentProcessing | null>;
    public abstract findByDocumentId(
        tenantId: TenantId,
        documentId: DocumentId,
    ): Promise<DocumentProcessing | null>;
    public abstract update(tenantId: TenantId, processing: DocumentProcessing): Promise<void>;
}
