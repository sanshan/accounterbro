import type { DocumentId } from '@accounterbro/core';

import { DocumentRegistrationStatus } from './document-registration-status.js';

export class Document {
    private constructor(
        public readonly id: DocumentId,
        public readonly contentHash: string,
        private registrationStatus: DocumentRegistrationStatus,
        private storedAt?: string,
        private registrationFailureReason?: string,
    ) {}

    public static pending(id: DocumentId, contentHash: string): Document {
        return new Document(id, contentHash, DocumentRegistrationStatus.Pending);
    }

    public static restore(state: {
        readonly id: DocumentId;
        readonly contentHash: string;
        readonly status: DocumentRegistrationStatus;
        readonly storageReference?: string;
        readonly failureReason?: string;
    }): Document {
        return new Document(
            state.id,
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
        return this.storedAt;
    }

    public get failureReason(): string | undefined {
        return this.registrationFailureReason;
    }

    public register(storageReference: string): void {
        this.assertPending();
        this.registrationStatus = DocumentRegistrationStatus.Registered;
        this.storedAt = storageReference;
        this.registrationFailureReason = undefined;
    }

    public fail(failureReason: string): void {
        this.assertPending();
        this.registrationStatus = DocumentRegistrationStatus.Failed;
        this.storedAt = undefined;
        this.registrationFailureReason = failureReason;
    }

    private assertPending(): void {
        if (this.registrationStatus !== DocumentRegistrationStatus.Pending) {
            throw new Error('Document registration can only finish from PENDING state.');
        }
    }
}
