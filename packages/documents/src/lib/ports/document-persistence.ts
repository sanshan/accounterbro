import type { DocumentId } from '@accounterbro/core';

import type { Document } from '../document/document.aggregate.js';

export type CreateDocumentResult =
    | { readonly kind: 'created'; readonly document: Document }
    | { readonly kind: 'existing'; readonly document: Document };

export abstract class DocumentPersistence {
    public abstract createOrGetExisting(document: Document): Promise<CreateDocumentResult>;
    public abstract findById(id: DocumentId): Promise<Document | null>;
    public abstract update(document: Document): Promise<void>;
}
