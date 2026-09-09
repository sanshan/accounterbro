import type { DataSource } from 'typeorm';

import { DocumentProcessingEntity } from './lib/persistence/typeorm/document-processing.entity.js';
import { CreateDocumentProcessing1788912000000 } from './lib/persistence/typeorm/migrations/1788912000000-CreateDocumentProcessing.js';
import { TypeOrmDocumentProcessingPersistence } from './lib/persistence/typeorm/typeorm-document-processing-persistence.js';
import type { DocumentProcessingPersistence } from './lib/ports/document-processing-persistence.js';

export { DocumentProcessingPersistence } from './lib/ports/document-processing-persistence.js';

export const DOCUMENT_PROCESSING_TYPEORM_ENTITIES = [DocumentProcessingEntity] as const;

export const DOCUMENT_PROCESSING_TYPEORM_MIGRATIONS = [CreateDocumentProcessing1788912000000] as const;

export function createDocumentProcessingPersistence(
    dataSource: DataSource,
): DocumentProcessingPersistence {
    return new TypeOrmDocumentProcessingPersistence(
        dataSource.getRepository(DocumentProcessingEntity),
    );
}
