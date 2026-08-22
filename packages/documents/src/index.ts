export type { Document, DocumentRegistrationStatus } from './lib/document.js';
export type { DocumentPersistence } from './lib/document-persistence.js';

export {
    DOCUMENT_REGISTERED_EVENT,
    type DocumentRegistered,
    type DocumentRegisteredPayload,
} from './lib/events/document-registered.js';
export {
    DOCUMENT_UPLOAD_REQUESTED_EVENT,
    type DocumentUploadRequested,
    type DocumentUploadRequestedPayload,
} from './lib/events/document-upload-requested.js';

export {
    FINISH_DOCUMENT_REGISTRATION_OPERATION,
    PREPARE_DOCUMENT_REGISTRATION_OPERATION,
} from './lib/operations/document-operation-names.js';
export { FinishDocumentRegistrationHandler } from './lib/operations/finish-document-registration-handler.js';
export type {
    FinishDocumentRegistrationOperation,
    FinishDocumentRegistrationOutcome,
    FinishDocumentRegistrationPayload,
} from './lib/operations/finish-document-registration-operation.js';
export { PrepareDocumentRegistrationHandler } from './lib/operations/prepare-document-registration-handler.js';
export type {
    PrepareDocumentRegistrationOperation,
    PrepareDocumentRegistrationOutcome,
    PrepareDocumentRegistrationPayload,
} from './lib/operations/prepare-document-registration-operation.js';
