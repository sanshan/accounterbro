import { describe, expect, it } from 'vitest';

import {
    DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS,
    DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS,
    documentProcessingOperationHandlerBindingsProvider,
    documentProcessingOperationHandlerProviders,
    documentProcessingReadHandlerBindingsProvider,
    documentProcessingReadHandlerProviders,
} from './execution.js';
import { documentProcessing } from './runtime.js';
import {
    DOCUMENT_PROCESSING_TYPEORM_ENTITIES,
    DOCUMENT_PROCESSING_TYPEORM_MIGRATIONS,
    DocumentProcessingPersistence,
    createDocumentProcessingPersistence,
} from './typeorm.js';

describe('@accounterbro/document-processing/runtime', () => {
    it('aggregates package execution and TypeORM contributions without reconstructing them', () => {
        expect(documentProcessing.execution).toEqual({
            providers: [
                ...documentProcessingOperationHandlerProviders,
                ...documentProcessingReadHandlerProviders,
                documentProcessingOperationHandlerBindingsProvider,
                documentProcessingReadHandlerBindingsProvider,
            ],
            operationBindingContainers: [DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS],
            readBindingContainers: [DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS],
        });
        expect(documentProcessing.typeorm).toEqual({
            entities: DOCUMENT_PROCESSING_TYPEORM_ENTITIES,
            migrations: DOCUMENT_PROCESSING_TYPEORM_MIGRATIONS,
            persistence: [
                {
                    provide: DocumentProcessingPersistence,
                    create: createDocumentProcessingPersistence,
                },
            ],
        });
    });
});
