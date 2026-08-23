export enum DocumentRegistrationStatus {
    Pending = 'PENDING',
    Registered = 'REGISTERED',
    Failed = 'FAILED',
}

export type FinishedDocumentRegistrationStatus =
    | DocumentRegistrationStatus.Registered
    | DocumentRegistrationStatus.Failed;
