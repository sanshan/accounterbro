import type { DocumentId, DocumentProcessingId, TenantId } from '@accounterbro/core';

import { DocumentProcessingStatus } from './document-processing-status.js';

export class DocumentProcessing {
    private constructor(
        public readonly id: DocumentProcessingId,
        public readonly tenantId: TenantId,
        public readonly documentId: DocumentId,
        private processingStatus: DocumentProcessingStatus,
        private processingExtractedText?: string,
        private processingFailureReason?: string,
    ) {}

    public static pending(
        id: DocumentProcessingId,
        tenantId: TenantId,
        documentId: DocumentId,
    ): DocumentProcessing {
        return new DocumentProcessing(id, tenantId, documentId, DocumentProcessingStatus.Pending);
    }

    public static restore(state: {
        readonly id: DocumentProcessingId;
        readonly tenantId: TenantId;
        readonly documentId: DocumentId;
        readonly status: DocumentProcessingStatus;
        readonly extractedText?: string;
        readonly failureReason?: string;
    }): DocumentProcessing {
        switch (state.status) {
            case DocumentProcessingStatus.Pending:
                if (state.extractedText !== undefined || state.failureReason !== undefined) {
                    throw new Error('PENDING DocumentProcessing cannot contain processing outcome data.');
                }
                break;
            case DocumentProcessingStatus.Completed:
                if (state.extractedText === undefined || state.failureReason !== undefined) {
                    throw new Error('COMPLETED DocumentProcessing must contain only extracted text.');
                }
                break;
            case DocumentProcessingStatus.Failed:
                if (state.failureReason === undefined || state.extractedText !== undefined) {
                    throw new Error('FAILED DocumentProcessing must contain only a failure reason.');
                }
                break;
            default:
                throw new Error(`Unsupported DocumentProcessing status: ${String(state.status)}`);
        }

        return new DocumentProcessing(
            state.id,
            state.tenantId,
            state.documentId,
            state.status,
            state.extractedText,
            state.failureReason,
        );
    }

    public get status(): DocumentProcessingStatus {
        return this.processingStatus;
    }

    public get extractedText(): string | undefined {
        return this.processingExtractedText;
    }

    public get failureReason(): string | undefined {
        return this.processingFailureReason;
    }

    public complete(extractedText: string): DocumentProcessingStatus.Completed {
        this.assertPending();
        this.processingStatus = DocumentProcessingStatus.Completed;
        this.processingExtractedText = extractedText;
        this.processingFailureReason = undefined;

        return DocumentProcessingStatus.Completed;
    }

    public fail(failureReason: string): DocumentProcessingStatus.Failed {
        this.assertPending();
        this.processingStatus = DocumentProcessingStatus.Failed;
        this.processingExtractedText = undefined;
        this.processingFailureReason = failureReason;

        return DocumentProcessingStatus.Failed;
    }

    private assertPending(): void {
        if (this.processingStatus !== DocumentProcessingStatus.Pending) {
            throw new Error('Document processing can only finish from PENDING state.');
        }
    }
}
