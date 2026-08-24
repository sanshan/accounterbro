import { Document } from '../../document/document.aggregate.js';
import type { DocumentEntity } from './document.entity.js';

export class DocumentMapper {
    public static toDomain(entity: DocumentEntity): Document {
        return Document.restore({
            id: entity.id,
            contentHash: entity.contentHash,
            status: entity.status,
            storageReference: entity.storageReference ?? undefined,
            failureReason: entity.failureReason ?? undefined,
        });
    }

    public static toPersistence(document: Document): DocumentEntity {
        return {
            id: document.id,
            contentHash: document.contentHash,
            status: document.status,
            storageReference: document.storageReference ?? null,
            failureReason: document.failureReason ?? null,
        } satisfies DocumentEntity;
    }
}
