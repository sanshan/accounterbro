import type { DocumentId, TenantId } from '@accounterbro/core';

import type { Document } from '../document/document.aggregate.js';

export type CreateDocumentResult =
    | { readonly kind: 'created'; readonly document: Document }
    | { readonly kind: 'existing'; readonly document: Document };

export abstract class DocumentPersistence {
    public abstract createOrGetExisting(
        tenantId: TenantId,
        document: Document,
    ): Promise<CreateDocumentResult>;
    public abstract findById(tenantId: TenantId, id: DocumentId): Promise<Document | null>;
    public abstract update(tenantId: TenantId, document: Document): Promise<void>;
}
