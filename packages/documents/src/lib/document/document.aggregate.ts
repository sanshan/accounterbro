import type { DocumentId, TenantId } from '@accounterbro/core';

import { DocumentRegistrationStatus } from './document-registration-status.js';

export class Document {
    private constructor(
        public readonly id: DocumentId,
        public readonly tenantId: TenantId,
        public readonly contentHash: string,
        private registrationStatus: DocumentRegistrationStatus,
        private registrationStorageReference?: string,
        private registrationFailureReason?: string,
    ) {}

    public static pending(id: DocumentId, tenantId: TenantId, contentHash: string): Document {
        return new Document(id, tenantId, contentHash, DocumentRegistrationStatus.Pending);
    }

    public static restore(state: {
        readonly id: DocumentId;
        readonly tenantId: TenantId;
        readonly contentHash: string;
        readonly status: DocumentRegistrationStatus;
        readonly storageReference?: string;
        readonly failureReason?: string;
    }): Document {
        switch (state.status) {
            case DocumentRegistrationStatus.Pending:
                if (state.storageReference !== undefined || state.failureReason !== undefined) {
                    throw new Error('PENDING Document cannot contain registration outcome data.');
                }
                break;
            case DocumentRegistrationStatus.Registered:
                if (state.storageReference === undefined || state.failureReason !== undefined) {
                    throw new Error('REGISTERED Document must contain only a storage reference.');
                }
                break;
            case DocumentRegistrationStatus.Failed:
                if (state.failureReason === undefined || state.storageReference !== undefined) {
                    throw new Error('FAILED Document must contain only a failure reason.');
                }
                break;
            default:
                throw new Error(`Unsupported Document registration status: ${String(state.status)}`);
        }

        return new Document(
            state.id,
            state.tenantId,
            state.contentHash,
            state.status,
            state.storageReference,
            state.failureReason,
        );
    }

    public get status(): DocumentRegistrationStatus {
        return this.registrationStatus;
    }

    public get storageReference(): string | undefined {
        return this.registrationStorageReference;
    }

    public get failureReason(): string | undefined {
        return this.registrationFailureReason;
    }

    public register(storageReference: string): DocumentRegistrationStatus.Registered {
        this.assertPending();
        this.registrationStatus = DocumentRegistrationStatus.Registered;
        this.registrationStorageReference = storageReference;
        this.registrationFailureReason = undefined;

        return DocumentRegistrationStatus.Registered;
    }

    public fail(failureReason: string): DocumentRegistrationStatus.Failed {
        this.assertPending();
        this.registrationStatus = DocumentRegistrationStatus.Failed;
        this.registrationStorageReference = undefined;
        this.registrationFailureReason = failureReason;

        return DocumentRegistrationStatus.Failed;
    }

    private assertPending(): void {
        if (this.registrationStatus !== DocumentRegistrationStatus.Pending) {
            throw new Error('Document registration can only finish from PENDING state.');
        }
    }
}
