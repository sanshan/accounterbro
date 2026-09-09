import type {
    OperationHandlerBinding,
    ReadHandlerBinding,
} from '@accounterbro/runtime-executions';

import { FinishDocumentProcessingHandler } from './lib/operations/finish-document-processing/finish-document-processing.handler.js';
import { documentProcessingOperationNames } from './lib/operations/names.js';
import { PrepareDocumentProcessingHandler } from './lib/operations/prepare-document-processing/prepare-document-processing.handler.js';
import { DocumentProcessingPersistence } from './lib/ports/document-processing-persistence.js';
import { GetDocumentProcessingReadHandler } from './lib/reads/get-document-processing/get-document-processing.handler.js';
import { documentProcessingReadNames } from './lib/reads/names.js';

const prepareDocumentProcessingHandlerProvider = {
    provide: PrepareDocumentProcessingHandler,
    inject: [DocumentProcessingPersistence],
    useFactory: (persistence: DocumentProcessingPersistence) =>
        new PrepareDocumentProcessingHandler(persistence),
};

const finishDocumentProcessingHandlerProvider = {
    provide: FinishDocumentProcessingHandler,
    inject: [DocumentProcessingPersistence],
    useFactory: (persistence: DocumentProcessingPersistence) =>
        new FinishDocumentProcessingHandler(persistence),
};

const getDocumentProcessingReadHandlerProvider = {
    provide: GetDocumentProcessingReadHandler,
    inject: [DocumentProcessingPersistence],
    useFactory: (persistence: DocumentProcessingPersistence) =>
        new GetDocumentProcessingReadHandler(persistence),
};

export const documentProcessingOperationHandlerProviders = [
    prepareDocumentProcessingHandlerProvider,
    finishDocumentProcessingHandlerProvider,
] as const;

export const documentProcessingReadHandlerProviders = [getDocumentProcessingReadHandlerProvider] as const;

export const DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS = Symbol(
    'DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS',
);

export const documentProcessingOperationHandlerBindingsProvider = {
    provide: DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS,
    inject: [PrepareDocumentProcessingHandler, FinishDocumentProcessingHandler],
    useFactory: (
        prepare: PrepareDocumentProcessingHandler,
        finish: FinishDocumentProcessingHandler,
    ): readonly OperationHandlerBinding[] => [
        {
            operationName: documentProcessingOperationNames.prepareProcessing,
            handler: prepare,
        },
        {
            operationName: documentProcessingOperationNames.finishProcessing,
            handler: finish,
        },
    ],
};

export const DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS = Symbol(
    'DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS',
);

export const documentProcessingReadHandlerBindingsProvider = {
    provide: DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS,
    inject: [GetDocumentProcessingReadHandler],
    useFactory: (getDocumentProcessing: GetDocumentProcessingReadHandler): readonly ReadHandlerBinding[] => [
        {
            readName: documentProcessingReadNames.getDocumentProcessing,
            handler: getDocumentProcessing,
        },
    ],
};
