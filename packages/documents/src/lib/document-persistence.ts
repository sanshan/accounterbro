import type { Document } from './document.js';

export type CreateDocumentResult =
    | { readonly kind: 'created'; readonly document: Document }
    | { readonly kind: 'existing'; readonly document: Document };

export interface DocumentPersistence {
    createOrGetExisting(document: Document): Promise<CreateDocumentResult>;
    findById(id: string): Promise<Document | null>;
    update(document: Document): Promise<void>;
}
