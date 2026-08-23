import { describe, expect, it } from 'vitest';

import * as documents from './index.js';
import { DocumentEntity } from './lib/persistence/typeorm/document.entity.js';
import { CreateDocuments1787440000000 } from './lib/persistence/typeorm/migrations/1787440000000-CreateDocuments.js';
import {
    DOCUMENTS_TYPEORM_ENTITIES,
    DOCUMENTS_TYPEORM_MIGRATIONS,
} from './typeorm.js';

describe('@accounterbro/documents/typeorm', () => {
    it('exposes package-owned TypeORM composition contracts', () => {
        expect(DOCUMENTS_TYPEORM_ENTITIES).toEqual([DocumentEntity]);
        expect(DOCUMENTS_TYPEORM_MIGRATIONS).toEqual([
            CreateDocuments1787440000000,
        ]);
    });

    it('keeps TypeORM implementation artifacts out of the business entrypoint', () => {
        expect(documents).not.toHaveProperty('DocumentEntity');
        expect(documents).not.toHaveProperty('DocumentMapper');
        expect(documents).not.toHaveProperty('CreateDocuments1787440000000');
        expect(documents).not.toHaveProperty('TypeOrmDocumentPersistence');
    });
});
