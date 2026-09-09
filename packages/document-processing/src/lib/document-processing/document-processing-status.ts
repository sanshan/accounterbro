export enum DocumentProcessingStatus {
    Pending = 'PENDING',
    Completed = 'COMPLETED',
    Failed = 'FAILED',
}

export type FinishedDocumentProcessingStatus =
    | DocumentProcessingStatus.Completed
    | DocumentProcessingStatus.Failed;
