import {
    tenantName,
    type DocumentId,
    type DocumentProcessingId,
    type TenantId,
    type TenantReference,
} from '@accounterbro/core';

import { DocumentProcessing } from '../../document-processing/document-processing.aggregate.js';
import { DocumentProcessingStatus } from '../../document-processing/document-processing-status.js';
import type { DocumentProcessingPersistence } from '../../ports/document-processing-persistence.js';
import { documentProcessingReadNames } from '../names.js';
import { GetDocumentProcessingReadHandler } from './get-document-processing.handler.js';
import type { GetDocumentProcessingRead } from './get-document-processing.read.js';

const processingId = 'processing-1' as DocumentProcessingId;
const documentId = 'document-1' as DocumentId;
const tenant = {
    type: tenantName,
    id: 'tenant-1' as TenantId,
} satisfies TenantReference;

function createPersistence(processing: DocumentProcessing | null) {
    const lookups: Array<{ readonly tenantId: TenantId; readonly documentId: DocumentId }> = [];
    const persistence: DocumentProcessingPersistence = {
        createOrGetExisting: async (_tenantId, candidate) => ({
            kind: 'created',
            processing: candidate,
        }),
        findById: async () => null,
        findByDocumentId: async (tenantId, requestedDocumentId) => {
            lookups.push({ tenantId, documentId: requestedDocumentId });
            return processing;
        },
        update: async () => undefined,
    };

    return { persistence, lookups };
}

function read(id: DocumentId = documentId): GetDocumentProcessingRead {
    return {
        name: documentProcessingReadNames.getDocumentProcessing,
        actor: { type: 'user', id: 'user-1', origin: {} },
        tenant,
        parameters: { documentId: id },
    };
}

describe('GetDocumentProcessingReadHandler', () => {
    it.each([
        {
            label: 'pending',
            processing: DocumentProcessing.pending(processingId, tenant.id, documentId),
            expected: {
                id: processingId,
                documentId,
                status: DocumentProcessingStatus.Pending,
            },
        },
        {
            label: 'completed',
            processing: DocumentProcessing.restore({
                id: processingId,
                tenantId: tenant.id,
                documentId,
                status: DocumentProcessingStatus.Completed,
                extractedText: 'extracted document text',
            }),
            expected: {
                id: processingId,
                documentId,
                status: DocumentProcessingStatus.Completed,
                extractedText: 'extracted document text',
            },
        },
        {
            label: 'failed',
            processing: DocumentProcessing.restore({
                id: processingId,
                tenantId: tenant.id,
                documentId,
                status: DocumentProcessingStatus.Failed,
                failureReason: 'extractor unavailable',
            }),
            expected: {
                id: processingId,
                documentId,
                status: DocumentProcessingStatus.Failed,
                failureReason: 'extractor unavailable',
            },
        },
    ])('returns only state-appropriate data for $label processing', async ({ processing, expected }) => {
        const { persistence, lookups } = createPersistence(processing);
        const handler = new GetDocumentProcessingReadHandler(persistence);

        await expect(handler.execute(read())).resolves.toEqual(expected);
        expect(lookups).toEqual([{ tenantId: tenant.id, documentId }]);
    });

    it('returns null when processing does not exist for the tenant/document pair', async () => {
        const { persistence } = createPersistence(null);
        const handler = new GetDocumentProcessingReadHandler(persistence);
        const missingDocumentId = 'missing-document' as DocumentId;

        await expect(handler.execute(read(missingDocumentId))).resolves.toBeNull();
    });
});
