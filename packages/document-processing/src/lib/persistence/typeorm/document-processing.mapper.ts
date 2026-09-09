import { DocumentProcessing } from '../../document-processing/document-processing.aggregate.js';
import type { DocumentProcessingEntity } from './document-processing.entity.js';

export class DocumentProcessingMapper {
    public static toDomain(entity: DocumentProcessingEntity): DocumentProcessing {
        return DocumentProcessing.restore({
            id: entity.id,
            tenantId: entity.tenantId,
            documentId: entity.documentId,
            status: entity.status,
            extractedText: entity.extractedText ?? undefined,
            failureReason: entity.failureReason ?? undefined,
        });
    }

    public static toPersistence(processing: DocumentProcessing): DocumentProcessingEntity {
        return {
            id: processing.id,
            tenantId: processing.tenantId,
            documentId: processing.documentId,
            status: processing.status,
            extractedText: processing.extractedText ?? null,
            failureReason: processing.failureReason ?? null,
        } satisfies DocumentProcessingEntity;
    }
}
