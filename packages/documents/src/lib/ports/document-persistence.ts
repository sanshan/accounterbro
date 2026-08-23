import type { DocumentId } from '@accounterbro/core';

import type { Document } from '../document/document.aggregate.js';

export type CreateDocumentResult =
    | { readonly kind: 'created'; readonly document: Document }
    | { readonly kind: 'existing'; readonly document: Document };

export interface DocumentPersistence {
    createOrGetExisting(document: Document): Promise<CreateDocumentResult>;
    findById(id: DocumentId): Promise<Document | null>;
    update(document: Document): Promise<void>;
}
