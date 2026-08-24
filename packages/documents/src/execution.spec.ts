import { describe, expect, it } from 'vitest';

import * as documents from './index.js';
import { FinishDocumentRegistrationHandler } from './lib/operations/finish-document-registration/finish-document-registration.handler.js';
import { PrepareDocumentRegistrationHandler } from './lib/operations/prepare-document-registration/prepare-document-registration.handler.js';
import { documentOperationNames } from './lib/operations/names.js';
import { DocumentPersistence } from './lib/ports/document-persistence.js';
import {
    DOCUMENTS_OPERATION_HANDLER_BINDINGS,
    documentsOperationHandlerBindingsProvider,
    documentsOperationHandlerProviders,
} from './execution.js';

const persistence: DocumentPersistence = {
    createOrGetExisting: async (document) => ({ kind: 'created', document }),
    findById: async () => null,
    update: async () => undefined,
};

describe('@accounterbro/documents/execution', () => {
    it('exposes package-owned provider descriptors for Documents Operation handlers', () => {
        const [prepareProvider, finishProvider] = documentsOperationHandlerProviders;

        expect(prepareProvider.provide).toBe(PrepareDocumentRegistrationHandler);
        expect(prepareProvider.inject).toEqual([DocumentPersistence]);
        expect(prepareProvider.useFactory(persistence)).toBeInstanceOf(
            PrepareDocumentRegistrationHandler,
        );

        expect(finishProvider.provide).toBe(FinishDocumentRegistrationHandler);
        expect(finishProvider.inject).toEqual([DocumentPersistence]);
        expect(finishProvider.useFactory(persistence)).toBeInstanceOf(
            FinishDocumentRegistrationHandler,
        );
    });

    it('exposes the package-owned Operation-name-to-handler binding group', () => {
        const [prepareProvider, finishProvider] = documentsOperationHandlerProviders;
        const prepare = prepareProvider.useFactory(persistence);
        const finish = finishProvider.useFactory(persistence);

        expect(documentsOperationHandlerBindingsProvider.provide).toBe(
            DOCUMENTS_OPERATION_HANDLER_BINDINGS,
        );
        expect(documentsOperationHandlerBindingsProvider.inject).toEqual([
            PrepareDocumentRegistrationHandler,
            FinishDocumentRegistrationHandler,
        ]);
        expect(documentsOperationHandlerBindingsProvider.useFactory(prepare, finish)).toEqual([
            {
                operationName: documentOperationNames.prepareRegistration,
                handler: prepare,
            },
            {
                operationName: documentOperationNames.finishRegistration,
                handler: finish,
            },
        ]);
    });

    it('keeps concrete Operation handler implementations out of the business entrypoint', () => {
        expect(documents).not.toHaveProperty('PrepareDocumentRegistrationHandler');
        expect(documents).not.toHaveProperty('FinishDocumentRegistrationHandler');
    });
});
