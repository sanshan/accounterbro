import { describe, expect, it } from 'vitest';

import { FinishDocumentProcessingHandler } from './lib/operations/finish-document-processing/finish-document-processing.handler.js';
import { documentProcessingOperationNames } from './lib/operations/names.js';
import { PrepareDocumentProcessingHandler } from './lib/operations/prepare-document-processing/prepare-document-processing.handler.js';
import { DocumentProcessingPersistence } from './lib/ports/document-processing-persistence.js';
import { GetDocumentProcessingReadHandler } from './lib/reads/get-document-processing/get-document-processing.handler.js';
import { documentProcessingReadNames } from './lib/reads/names.js';
import {
    DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS,
    DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS,
    documentProcessingOperationHandlerBindingsProvider,
    documentProcessingOperationHandlerProviders,
    documentProcessingReadHandlerBindingsProvider,
    documentProcessingReadHandlerProviders,
} from './execution.js';

const persistence: DocumentProcessingPersistence = {
    createOrGetExisting: async (_tenantId, processing) => ({ kind: 'created', processing }),
    findById: async () => null,
    findByDocumentId: async () => null,
    update: async () => undefined,
};

describe('@accounterbro/document-processing/execution', () => {
    it('exposes package-owned provider descriptors for Document Processing handlers', () => {
        const [prepareProvider, finishProvider] = documentProcessingOperationHandlerProviders;
        const [getProcessingProvider] = documentProcessingReadHandlerProviders;

        expect(prepareProvider.provide).toBe(PrepareDocumentProcessingHandler);
        expect(prepareProvider.inject).toEqual([DocumentProcessingPersistence]);
        expect(prepareProvider.useFactory(persistence)).toBeInstanceOf(PrepareDocumentProcessingHandler);

        expect(finishProvider.provide).toBe(FinishDocumentProcessingHandler);
        expect(finishProvider.inject).toEqual([DocumentProcessingPersistence]);
        expect(finishProvider.useFactory(persistence)).toBeInstanceOf(FinishDocumentProcessingHandler);

        expect(getProcessingProvider.provide).toBe(GetDocumentProcessingReadHandler);
        expect(getProcessingProvider.inject).toEqual([DocumentProcessingPersistence]);
        expect(getProcessingProvider.useFactory(persistence)).toBeInstanceOf(
            GetDocumentProcessingReadHandler,
        );
    });

    it('exposes the package-owned Operation-name-to-handler binding group', () => {
        const [prepareProvider, finishProvider] = documentProcessingOperationHandlerProviders;
        const prepare = prepareProvider.useFactory(persistence);
        const finish = finishProvider.useFactory(persistence);

        expect(documentProcessingOperationHandlerBindingsProvider.provide).toBe(
            DOCUMENT_PROCESSING_OPERATION_HANDLER_BINDINGS,
        );
        expect(documentProcessingOperationHandlerBindingsProvider.inject).toEqual([
            PrepareDocumentProcessingHandler,
            FinishDocumentProcessingHandler,
        ]);
        expect(documentProcessingOperationHandlerBindingsProvider.useFactory(prepare, finish)).toEqual([
            {
                operationName: documentProcessingOperationNames.prepareProcessing,
                handler: prepare,
            },
            {
                operationName: documentProcessingOperationNames.finishProcessing,
                handler: finish,
            },
        ]);
    });

    it('exposes the package-owned Read-name-to-handler binding group', () => {
        const [getProcessingProvider] = documentProcessingReadHandlerProviders;
        const getProcessing = getProcessingProvider.useFactory(persistence);

        expect(documentProcessingReadHandlerBindingsProvider.provide).toBe(
            DOCUMENT_PROCESSING_READ_HANDLER_BINDINGS,
        );
        expect(documentProcessingReadHandlerBindingsProvider.inject).toEqual([
            GetDocumentProcessingReadHandler,
        ]);
        expect(documentProcessingReadHandlerBindingsProvider.useFactory(getProcessing)).toEqual([
            {
                readName: documentProcessingReadNames.getDocumentProcessing,
                handler: getProcessing,
            },
        ]);
    });
});
