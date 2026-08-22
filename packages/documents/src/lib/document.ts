export type DocumentRegistrationStatus = 'PENDING' | 'REGISTERED' | 'FAILED';

export interface Document {
    readonly id: string;
    readonly contentHash: string;
    readonly status: DocumentRegistrationStatus;
    readonly storageReference?: string;
    readonly failureReason?: string;
}
