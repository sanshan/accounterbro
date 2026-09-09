import {
    documentProcessingName,
    tenantName,
    type DocumentId,
    type DocumentProcessingId,
    type TenantId,
} from '@accounterbro/core';

import { DocumentProcessing } from '../../document-processing/document-processing.aggregate.js';
import { DocumentProcessingStatus } from '../../document-processing/document-processing-status.js';
import { documentProcessingEventNames } from '../../events/names.js';
import type { DocumentProcessingPersistence } from '../../ports/document-processing-persistence.js';
import { documentProcessingOperationNames } from '../names.js';
import { FinishDocumentProcessingHandler } from './finish-document-processing.handler.js';
import type { FinishDocumentProcessingOperation } from './finish-document-processing.operation.js';

const processingId = 'processing-1' as DocumentProcessingId;
const documentId = 'document-1' as DocumentId;
const tenantId = 'tenant-1' as TenantId;

function createPersistence(processing: DocumentProcessing | null) {
    const lookups: Array<{ readonly tenantId: TenantId; readonly processingId: DocumentProcessingId }> = [];
    const updated: Array<{
        readonly tenantId: TenantId;
        readonly processing: DocumentProcessing;
    }> = [];
    const persistence: DocumentProcessingPersistence = {
        createOrGetExisting: async (_tenantId, candidate) => ({
            kind: 'created',
            processing: candidate,
        }),
        findById: async (scopeTenantId, requestedProcessingId) => {
            lookups.push({ tenantId: scopeTenantId, processingId: requestedProcessingId });
            return processing;
        },
        findByDocumentId: async () => null,
        update: async (scopeTenantId, next) => {
            updated.push({ tenantId: scopeTenantId, processing: next });
        },
    };

    return { persistence, lookups, updated };
}

function operation(payload: FinishDocumentProcessingOperation['payload']): FinishDocumentProcessingOperation {
    return {
        name: documentProcessingOperationNames.finishProcessing,
        schemaVersion: 1,
        intent: { id: 'intent-1', key: 'intent-key' },
        actor: { type: 'system', id: 'document-processing-orchestrator', origin: {} },
        tenant: { type: tenantName, id: tenantId },
        subject: { type: documentProcessingName, id: processingId },
        aggregate: { type: documentProcessingName, id: processingId },
        payload,
    };
}

function pending(): DocumentProcessing {
    return DocumentProcessing.pending(processingId, tenantId, documentId);
}

describe('FinishDocumentProcessingHandler', () => {
    it('completes pending processing and emits only the completion business fact', async () => {
        const { persistence, lookups, updated } = createPersistence(pending());
        const handler = new FinishDocumentProcessingHandler(persistence);

        const result = await handler.execute(
            operation({ outcome: 'completed', extractedText: 'extracted document text' }),
        );

        expect(lookups).toEqual([{ tenantId, processingId }]);
        expect(updated).toHaveLength(1);
        expect(updated[0]?.tenantId).toBe(tenantId);
        expect(updated[0]?.processing.status).toBe(DocumentProcessingStatus.Completed);
        expect(updated[0]?.processing.extractedText).toBe('extracted document text');
        expect(updated[0]?.processing.failureReason).toBeUndefined();
        expect(result.data).toEqual({
            id: processingId,
            status: DocumentProcessingStatus.Completed,
        });
        expect(result.events).toEqual([
            {
                name: documentProcessingEventNames.completed,
                schemaVersion: 1,
                payload: {
                    processingId,
                    documentId,
                },
            },
        ]);
    });

    it('fails pending processing without emitting a speculative failure event', async () => {
        const { persistence, updated } = createPersistence(pending());
        const handler = new FinishDocumentProcessingHandler(persistence);

        const result = await handler.execute(
            operation({ outcome: 'failed', failureReason: 'extractor unavailable' }),
        );

        expect(updated).toHaveLength(1);
        expect(updated[0]?.tenantId).toBe(tenantId);
        expect(updated[0]?.processing.status).toBe(DocumentProcessingStatus.Failed);
        expect(updated[0]?.processing.extractedText).toBeUndefined();
        expect(updated[0]?.processing.failureReason).toBe('extractor unavailable');
        expect(result.data).toEqual({
            id: processingId,
            status: DocumentProcessingStatus.Failed,
        });
        expect(result.events).toEqual([]);
    });
});
