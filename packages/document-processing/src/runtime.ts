import { defineRuntimePackage } from '@accounterbro/runtime-executions';

import {
    DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS,
    DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS,
    documentProcessingOperationHandlerBindingsProvider,
    documentProcessingOperationHandlerProviders,
    documentProcessingReadHandlerBindingsProvider,
    documentProcessingReadHandlerProviders,
} from './execution.js';
import {
    DOCUMENT_PROCESSING_TYPEORM_ENTITIES,
    DOCUMENT_PROCESSING_TYPEORM_MIGRATIONS,
    DocumentProcessingPersistence,
    createDocumentProcessingPersistence,
} from './typeorm.js';

export const documentProcessing = defineRuntimePackage({
    execution: {
        providers: [
            ...documentProcessingOperationHandlerProviders,
            ...documentProcessingReadHandlerProviders,
            documentProcessingOperationHandlerBindingsProvider,
            documentProcessingReadHandlerBindingsProvider,
        ],
        operationBindingContainers: [DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS],
        readBindingContainers: [DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS],
    },
    typeorm: {
        entities: DOCUMENT_PROCESSING_TYPEORM_ENTITIES,
        migrations: DOCUMENT_PROCESSING_TYPEORM_MIGRATIONS,
        persistence: [
            {
                provide: DocumentProcessingPersistence,
                create: createDocumentProcessingPersistence,
            },
        ],
    },
});
