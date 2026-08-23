import type { DataSource } from 'typeorm';

import { DocumentEntity } from './lib/persistence/typeorm/document.entity.js';
import { CreateDocuments1787440000000 } from './lib/persistence/typeorm/migrations/1787440000000-CreateDocuments.js';
import { TypeOrmDocumentPersistence } from './lib/persistence/typeorm/typeorm-document-persistence.js';
import type { DocumentPersistence } from './lib/ports/document-persistence.js';

export { DocumentPersistence } from './lib/ports/document-persistence.js';

export const DOCUMENTS_TYPEORM_ENTITIES = [DocumentEntity] as const;

export const DOCUMENTS_TYPEORM_MIGRATIONS = [
    CreateDocuments1787440000000,
] as const;

export function createDocumentPersistence(dataSource: DataSource): DocumentPersistence {
    return new TypeOrmDocumentPersistence(dataSource.getRepository(DocumentEntity));
}
