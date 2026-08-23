import { DocumentEntity } from './lib/persistence/typeorm/document.entity.js';
import { CreateDocuments1787440000000 } from './lib/persistence/typeorm/migrations/1787440000000-CreateDocuments.js';

export const DOCUMENTS_TYPEORM_ENTITIES = [DocumentEntity] as const;

export const DOCUMENTS_TYPEORM_MIGRATIONS = [
    CreateDocuments1787440000000,
] as const;
