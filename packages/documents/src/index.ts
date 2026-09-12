export { Document } from './lib/document/document.aggregate.js';
export {
    DocumentRegistrationStatus,
    type FinishedDocumentRegistrationStatus,
} from './lib/document/document-registration-status.js';

export { documentEventNames } from './lib/events/names.js';
export {
    DocumentRegisteredEventContract,
    type DocumentRegisteredEvent,
    type DocumentRegisteredPayload,
} from './lib/events/document-registered/document-registered.event.js';

export { documentOperationNames } from './lib/operations/names.js';
export type {
    FinishDocumentRegistrationOperation,
    FinishDocumentRegistrationOutcome,
    FinishDocumentRegistrationPayload,
} from './lib/operations/finish-document-registration/finish-document-registration.operation.js';
export type {
    PrepareDocumentRegistrationOperation,
    PrepareDocumentRegistrationOutcome,
    PrepareDocumentRegistrationPayload,
} from './lib/operations/prepare-document-registration/prepare-document-registration.operation.js';

export { documentReadNames } from './lib/reads/names.js';
export type {
    GetDocumentParameters,
    GetDocumentRead,
    GetDocumentResult,
} from './lib/reads/get-document/get-document.read.js';
