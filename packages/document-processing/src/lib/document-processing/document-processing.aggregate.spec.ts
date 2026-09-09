import type { DocumentId, DocumentProcessingId, TenantId } from '@accounterbro/core';

import { DocumentProcessing } from './document-processing.aggregate.js';
import { DocumentProcessingStatus } from './document-processing-status.js';

const processingId = 'processing-1' as DocumentProcessingId;
const tenantId = 'tenant-1' as TenantId;
const documentId = 'document-1' as DocumentId;

describe('DocumentProcessing', () => {
    it('starts pending without outcome data', () => {
        const processing = DocumentProcessing.pending(processingId, tenantId, documentId);

        expect(processing.id).toBe(processingId);
        expect(processing.tenantId).toBe(tenantId);
        expect(processing.documentId).toBe(documentId);
        expect(processing.status).toBe(DocumentProcessingStatus.Pending);
        expect(processing.extractedText).toBeUndefined();
        expect(processing.failureReason).toBeUndefined();
    });

    it('restores each valid state shape', () => {
        const pending = DocumentProcessing.restore({
            id: processingId,
            tenantId,
            documentId,
            status: DocumentProcessingStatus.Pending,
        });
        const completed = DocumentProcessing.restore({
            id: processingId,
            tenantId,
            documentId,
            status: DocumentProcessingStatus.Completed,
            extractedText: '',
        });
        const failed = DocumentProcessing.restore({
            id: processingId,
            tenantId,
            documentId,
            status: DocumentProcessingStatus.Failed,
            failureReason: '',
        });

        expect(pending.status).toBe(DocumentProcessingStatus.Pending);
        expect(completed.status).toBe(DocumentProcessingStatus.Completed);
        expect(completed.extractedText).toBe('');
        expect(failed.status).toBe(DocumentProcessingStatus.Failed);
        expect(failed.failureReason).toBe('');
    });

    it('completes only from pending state', () => {
        const processing = DocumentProcessing.pending(processingId, tenantId, documentId);

        expect(processing.complete('extracted text')).toBe(DocumentProcessingStatus.Completed);
        expect(processing.status).toBe(DocumentProcessingStatus.Completed);
        expect(processing.extractedText).toBe('extracted text');
        expect(processing.failureReason).toBeUndefined();
        expect(() => processing.fail('extractor failed')).toThrow(
            'Document processing can only finish from PENDING state.',
        );
    });

    it('fails only from pending state', () => {
        const processing = DocumentProcessing.pending(processingId, tenantId, documentId);

        expect(processing.fail('extractor failed')).toBe(DocumentProcessingStatus.Failed);
        expect(processing.status).toBe(DocumentProcessingStatus.Failed);
        expect(processing.extractedText).toBeUndefined();
        expect(processing.failureReason).toBe('extractor failed');
        expect(() => processing.complete('extracted text')).toThrow(
            'Document processing can only finish from PENDING state.',
        );
    });

    it('rejects restored pending state with outcome data', () => {
        expect(() =>
            DocumentProcessing.restore({
                id: processingId,
                tenantId,
                documentId,
                status: DocumentProcessingStatus.Pending,
                extractedText: 'unexpected',
            }),
        ).toThrow('PENDING DocumentProcessing cannot contain processing outcome data.');

        expect(() =>
            DocumentProcessing.restore({
                id: processingId,
                tenantId,
                documentId,
                status: DocumentProcessingStatus.Pending,
                failureReason: 'unexpected',
            }),
        ).toThrow('PENDING DocumentProcessing cannot contain processing outcome data.');
    });

    it('rejects restored completed state without exactly extracted text', () => {
        expect(() =>
            DocumentProcessing.restore({
                id: processingId,
                tenantId,
                documentId,
                status: DocumentProcessingStatus.Completed,
            }),
        ).toThrow('COMPLETED DocumentProcessing must contain only extracted text.');

        expect(() =>
            DocumentProcessing.restore({
                id: processingId,
                tenantId,
                documentId,
                status: DocumentProcessingStatus.Completed,
                extractedText: 'text',
                failureReason: 'unexpected',
            }),
        ).toThrow('COMPLETED DocumentProcessing must contain only extracted text.');
    });

    it('rejects restored failed state without exactly a failure reason', () => {
        expect(() =>
            DocumentProcessing.restore({
                id: processingId,
                tenantId,
                documentId,
                status: DocumentProcessingStatus.Failed,
            }),
        ).toThrow('FAILED DocumentProcessing must contain only a failure reason.');

        expect(() =>
            DocumentProcessing.restore({
                id: processingId,
                tenantId,
                documentId,
                status: DocumentProcessingStatus.Failed,
                extractedText: 'unexpected',
                failureReason: 'failed',
            }),
        ).toThrow('FAILED DocumentProcessing must contain only a failure reason.');
    });
});
