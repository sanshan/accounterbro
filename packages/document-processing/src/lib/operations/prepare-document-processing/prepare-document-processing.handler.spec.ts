import {
    documentProcessingName,
    tenantName,
    type DocumentId,
    type DocumentProcessingId,
    type TenantId,
} from '@accounterbro/core';

import { DocumentProcessing } from '../../document-processing/document-processing.aggregate.js';
import { DocumentProcessingStatus } from '../../document-processing/document-processing-status.js';
import type { DocumentProcessingPersistence } from '../../ports/document-processing-persistence.js';
import { documentProcessingOperationNames } from '../names.js';
import { PrepareDocumentProcessingHandler } from './prepare-document-processing.handler.js';
import type { PrepareDocumentProcessingOperation } from './prepare-document-processing.operation.js';

const processingId = 'processing-1' as DocumentProcessingId;
const documentId = 'document-1' as DocumentId;
const tenantId = 'tenant-1' as TenantId;

function createPersistence(existing: DocumentProcessing | null = null) {
    const attempted: Array<{
        readonly tenantId: TenantId;
        readonly processing: DocumentProcessing;
    }> = [];
    const persistence: DocumentProcessingPersistence = {
        createOrGetExisting: async (scopeTenantId, processing) => {
            attempted.push({ tenantId: scopeTenantId, processing });
            return existing
                ? { kind: 'existing', processing: existing }
                : { kind: 'created', processing };
        },
        findById: async () => null,
        findByDocumentId: async () => null,
        update: async () => undefined,
    };

    return { persistence, attempted };
}

function operation(): PrepareDocumentProcessingOperation {
    return {
        name: documentProcessingOperationNames.prepareProcessing,
        schemaVersion: 1,
        intent: { id: 'intent-1', key: 'intent-key' },
        actor: { type: 'system', id: 'document-processing-orchestrator', origin: {} },
        tenant: { type: tenantName, id: tenantId },
        subject: { type: documentProcessingName, id: processingId },
        aggregate: { type: documentProcessingName, id: processingId },
        payload: { processingId, documentId },
    };
}

describe('PrepareDocumentProcessingHandler', () => {
    it('creates pending processing in the execution tenant scope', async () => {
        const { persistence, attempted } = createPersistence();
        const handler = new PrepareDocumentProcessingHandler(persistence);

        const result = await handler.execute(operation());

        expect(attempted).toHaveLength(1);
        expect(attempted[0]?.tenantId).toBe(tenantId);
        expect(attempted[0]?.processing.id).toBe(processingId);
        expect(attempted[0]?.processing.tenantId).toBe(tenantId);
        expect(attempted[0]?.processing.documentId).toBe(documentId);
        expect(attempted[0]?.processing.status).toBe(DocumentProcessingStatus.Pending);
        expect(result.data).toEqual({
            kind: 'created',
            processing: {
                id: processingId,
                documentId,
                status: DocumentProcessingStatus.Pending,
            },
        });
        expect(result.events).toEqual([]);
    });

    it('returns the tenant/document persistence winner as existing without events', async () => {
        const existingId = 'existing-processing' as DocumentProcessingId;
        const existing = DocumentProcessing.restore({
            id: existingId,
            tenantId,
            documentId,
            status: DocumentProcessingStatus.Failed,
            failureReason: 'extractor unavailable',
        });
        const { persistence, attempted } = createPersistence(existing);
        const handler = new PrepareDocumentProcessingHandler(persistence);

        const result = await handler.execute(operation());

        expect(attempted).toHaveLength(1);
        expect(attempted[0]?.tenantId).toBe(tenantId);
        expect(attempted[0]?.processing.id).toBe(processingId);
        expect(result.data).toEqual({
            kind: 'existing',
            processing: {
                id: existingId,
                documentId,
                status: DocumentProcessingStatus.Failed,
            },
        });
        expect(result.events).toEqual([]);
    });
});
