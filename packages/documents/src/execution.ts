import { FinishDocumentRegistrationHandler } from './lib/operations/finish-document-registration/finish-document-registration.handler.js';
import { PrepareDocumentRegistrationHandler } from './lib/operations/prepare-document-registration/prepare-document-registration.handler.js';
import { DocumentPersistence } from './lib/ports/document-persistence.js';

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

export const documentsOperationHandlerProviders = [
    prepareDocumentRegistrationHandlerProvider,
    finishDocumentRegistrationHandlerProvider,
] as const;
