export { Document } from './lib/document/document.aggregate.js';
export {
    DocumentRegistrationStatus,
    type FinishedDocumentRegistrationStatus,
} from './lib/document/document-registration-status.js';

export { documentEventNames } from './lib/events/names.js';
export {
    DocumentRegisteredEvent,
    type DocumentRegisteredPayload,
} from './lib/events/document-registered/document-registered.event.js';
export {
    DocumentUploadRequestedEvent,
    type DocumentUploadRequestedPayload,
} from './lib/events/document-upload-requested/document-upload-requested.event.js';

export { documentOperationNames } from './lib/operations/names.js';
export { FinishDocumentRegistrationHandler } from './lib/operations/finish-document-registration/finish-document-registration.handler.js';
export type {
    FinishDocumentRegistrationOperation,
    FinishDocumentRegistrationOutcome,
    FinishDocumentRegistrationPayload,
} from './lib/operations/finish-document-registration/finish-document-registration.operation.js';
export { PrepareDocumentRegistrationHandler } from './lib/operations/prepare-document-registration/prepare-document-registration.handler.js';
export type {
    PrepareDocumentRegistrationOperation,
    PrepareDocumentRegistrationOutcome,
    PrepareDocumentRegistrationPayload,
} from './lib/operations/prepare-document-registration/prepare-document-registration.operation.js';

export { documentReadNames } from './lib/reads/names.js';
export { GetDocumentReadHandler } from './lib/reads/get-document/get-document.handler.js';
export type {
    GetDocumentParameters,
    GetDocumentRead,
    GetDocumentResult,
} from './lib/reads/get-document/get-document.read.js';
