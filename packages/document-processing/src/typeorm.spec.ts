import { describe, expect, it } from 'vitest';

import { DocumentProcessingEntity } from './lib/persistence/typeorm/document-processing.entity.js';
import { CreateDocumentProcessing1788912000000 } from './lib/persistence/typeorm/migrations/1788912000000-CreateDocumentProcessing.js';
import {
    DOCUMENT_PROCESSING_TYPEORM_ENTITIES,
    DOCUMENT_PROCESSING_TYPEORM_MIGRATIONS,
} from './typeorm.js';

describe('@accounterbro/document-processing/typeorm', () => {
    it('exposes package-owned TypeORM composition contracts', () => {
        expect(DOCUMENT_PROCESSING_TYPEORM_ENTITIES).toEqual([DocumentProcessingEntity]);
        expect(DOCUMENT_PROCESSING_TYPEORM_MIGRATIONS).toEqual([
            CreateDocumentProcessing1788912000000,
        ]);
    });
});
