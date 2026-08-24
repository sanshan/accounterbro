import { describe, expect, it } from 'vitest';

import * as documents from './index.js';
import { FinishDocumentRegistrationHandler } from './lib/operations/finish-document-registration/finish-document-registration.handler.js';
import { PrepareDocumentRegistrationHandler } from './lib/operations/prepare-document-registration/prepare-document-registration.handler.js';
import { documentOperationNames } from './lib/operations/names.js';
import { DocumentPersistence } from './lib/ports/document-persistence.js';
import { GetDocumentReadHandler } from './lib/reads/get-document/get-document.handler.js';
import { documentReadNames } from './lib/reads/names.js';
import {
    DOCUMENTS_OPERATION_HANDLER_BINDINGS,
    DOCUMENTS_READ_HANDLER_BINDINGS,
    documentsOperationHandlerBindingsProvider,
    documentsOperationHandlerProviders,
    documentsReadHandlerBindingsProvider,
    documentsReadHandlerProviders,
} from './execution.js';

const persistence: DocumentPersistence = {
    createOrGetExisting: async (document) => ({ kind: 'created', document }),
    findById: async () => null,
    update: async () => undefined,
};

describe('@accounterbro/documents/execution', () => {
    it('exposes package-owned provider descriptors for Documents handlers', () => {
        const [prepareProvider, finishProvider] = documentsOperationHandlerProviders;
        const [getDocumentProvider] = documentsReadHandlerProviders;

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

        expect(getDocumentProvider.provide).toBe(GetDocumentReadHandler);
        expect(getDocumentProvider.inject).toEqual([DocumentPersistence]);
        expect(getDocumentProvider.useFactory(persistence)).toBeInstanceOf(GetDocumentReadHandler);
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

    it('exposes the package-owned Read-name-to-handler binding group', () => {
        const [getDocumentProvider] = documentsReadHandlerProviders;
        const getDocument = getDocumentProvider.useFactory(persistence);

        expect(documentsReadHandlerBindingsProvider.provide).toBe(DOCUMENTS_READ_HANDLER_BINDINGS);
        expect(documentsReadHandlerBindingsProvider.inject).toEqual([GetDocumentReadHandler]);
        expect(documentsReadHandlerBindingsProvider.useFactory(getDocument)).toEqual([
            {
                readName: documentReadNames.getDocument,
                handler: getDocument,
            },
        ]);
    });

    it('keeps concrete handler implementations out of the business entrypoint', () => {
        expect(documents).not.toHaveProperty('PrepareDocumentRegistrationHandler');
        expect(documents).not.toHaveProperty('FinishDocumentRegistrationHandler');
        expect(documents).not.toHaveProperty('GetDocumentReadHandler');
    });
});
