import { describe, expect, it } from 'vitest';

import { DocumentEntity } from './lib/persistence/typeorm/document.entity.js';
import { CreateDocuments1787440000000 } from './lib/persistence/typeorm/migrations/1787440000000-CreateDocuments.js';
import { AddDocumentTenantScope1787961600000 } from './lib/persistence/typeorm/migrations/1787961600000-AddDocumentTenantScope.js';
import {
    DOCUMENTS_TYPEORM_ENTITIES,
    DOCUMENTS_TYPEORM_MIGRATIONS,
} from './typeorm.js';

describe('@accounterbro/documents/typeorm', () => {
    it('exposes package-owned TypeORM composition contracts', () => {
        expect(DOCUMENTS_TYPEORM_ENTITIES).toEqual([DocumentEntity]);
        expect(DOCUMENTS_TYPEORM_MIGRATIONS).toEqual([
            CreateDocuments1787440000000,
            AddDocumentTenantScope1787961600000,
        ]);
    });
});
