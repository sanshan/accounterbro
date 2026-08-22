import type { Document } from './document.js';

export interface DocumentPersistence {
    findByContentHash(contentHash: string): Promise<Document | null>;
    findById(id: string): Promise<Document | null>;
    insert(document: Document): Promise<void>;
    update(document: Document): Promise<void>;
}
