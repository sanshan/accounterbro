import type { OperationHandlerBinding } from '@accounterbro/service-runtime';

import { FinishDocumentRegistrationHandler } from './lib/operations/finish-document-registration/finish-document-registration.handler.js';
import { PrepareDocumentRegistrationHandler } from './lib/operations/prepare-document-registration/prepare-document-registration.handler.js';
import { documentOperationNames } from './lib/operations/names.js';
import { DocumentPersistence } from './lib/ports/document-persistence.js';
import { GetDocumentReadHandler } from './lib/reads/get-document/get-document.handler.js';

const prepareDocumentRegistrationHandlerProvider = {
    provide: PrepareDocumentRegistrationHandler,
    inject: [DocumentPersistence],
    useFactory: (persistence: DocumentPersistence) =>
        new PrepareDocumentRegistrationHandler(persistence),
} as const;

const finishDocumentRegistrationHandlerProvider = {
    provide: FinishDocumentRegistrationHandler,
    inject: [DocumentPersistence],
    useFactory: (persistence: DocumentPersistence) =>
        new FinishDocumentRegistrationHandler(persistence),
} as const;

const getDocumentReadHandlerProvider = {
    provide: GetDocumentReadHandler,
    inject: [DocumentPersistence],
    useFactory: (persistence: DocumentPersistence) => new GetDocumentReadHandler(persistence),
} as const;

export const documentsOperationHandlerProviders = [
    prepareDocumentRegistrationHandlerProvider,
    finishDocumentRegistrationHandlerProvider,
] as const;

export const documentsReadHandlerProviders = [getDocumentReadHandlerProvider] as const;

export const DOCUMENTS_OPERATION_HANDLER_BINDINGS = Symbol(
    'DOCUMENTS_OPERATION_HANDLER_BINDINGS',
);

export const documentsOperationHandlerBindingsProvider = {
    provide: DOCUMENTS_OPERATION_HANDLER_BINDINGS,
    inject: [PrepareDocumentRegistrationHandler, FinishDocumentRegistrationHandler],
    useFactory: (
        prepare: PrepareDocumentRegistrationHandler,
        finish: FinishDocumentRegistrationHandler,
    ): readonly OperationHandlerBinding[] => [
        {
            operationName: documentOperationNames.prepareRegistration,
            handler: prepare,
        },
        {
            operationName: documentOperationNames.finishRegistration,
            handler: finish,
        },
    ],
} as const;
