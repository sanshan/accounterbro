import { defineRuntimePackage } from '@accounterbro/runtime-executions';

import {
    DOCUMENTS_OPERATION_HANDLER_BINDINGS,
    DOCUMENTS_READ_HANDLER_BINDINGS,
    documentsOperationHandlerBindingsProvider,
    documentsOperationHandlerProviders,
    documentsReadHandlerBindingsProvider,
    documentsReadHandlerProviders,
} from './execution.js';
import {
    DOCUMENTS_TYPEORM_ENTITIES,
    DOCUMENTS_TYPEORM_MIGRATIONS,
    DocumentPersistence,
    createDocumentPersistence,
} from './typeorm.js';

export const documents = defineRuntimePackage({
    execution: {
        providers: [
            ...documentsOperationHandlerProviders,
            ...documentsReadHandlerProviders,
            documentsOperationHandlerBindingsProvider,
            documentsReadHandlerBindingsProvider,
        ],
        operationBindingContainers: [DOCUMENTS_OPERATION_HANDLER_BINDINGS],
        readBindingContainers: [DOCUMENTS_READ_HANDLER_BINDINGS],
    },
    typeorm: {
        entities: DOCUMENTS_TYPEORM_ENTITIES,
        migrations: DOCUMENTS_TYPEORM_MIGRATIONS,
        persistence: [
            {
                provide: DocumentPersistence,
                create: createDocumentPersistence,
            },
        ],
    },
});
