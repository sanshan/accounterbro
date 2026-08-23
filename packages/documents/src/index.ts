export type { Document, DocumentRegistrationStatus } from './lib/document.js';
export type {
    CreateDocumentResult,
    DocumentPersistence,
} from './lib/document-persistence.js';

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

export { DocumentEntity } from './lib/persistence/typeorm/document.entity.js';
export { DocumentMapper } from './lib/persistence/typeorm/document.mapper.js';
export { CreateDocuments1787440000000 } from './lib/persistence/typeorm/migrations/1787440000000-CreateDocuments.js';
export { TypeOrmDocumentPersistence } from './lib/persistence/typeorm/typeorm-document-persistence.js';

export { GET_DOCUMENT_READ } from './lib/reads/document-read-names.js';
export { GetDocumentReadHandler } from './lib/reads/get-document-read-handler.js';
export type {
    GetDocumentParameters,
    GetDocumentRead,
    GetDocumentResult,
} from './lib/reads/get-document-read.js';
