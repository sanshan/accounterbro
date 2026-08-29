import type { DocumentId, TenantId } from '@accounterbro/core';

import { Document } from '../../document/document.aggregate.js';
import { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import { documentEventNames } from '../../events/names.js';
import type { DocumentPersistence } from '../../ports/document-persistence.js';
import { documentOperationNames } from '../names.js';
import { FinishDocumentRegistrationHandler } from './finish-document-registration.handler.js';
import type { FinishDocumentRegistrationOperation } from './finish-document-registration.operation.js';

const documentId = 'document-1' as DocumentId;
const tenantId = 'tenant-1' as TenantId;

function createPersistence(document: Document | null) {
    const lookups: Array<{ readonly tenantId: TenantId; readonly documentId: DocumentId }> = [];
    const updated: Array<{ readonly tenantId: TenantId; readonly document: Document }> = [];
    const persistence: DocumentPersistence = {
        createOrGetExisting: async (_tenantId, candidate) => ({
            kind: 'created',
            document: candidate,
        }),
        findById: async (scopeTenantId, requestedDocumentId) => {
            lookups.push({ tenantId: scopeTenantId, documentId: requestedDocumentId });
            return document;
        },
        update: async (scopeTenantId, next) => {
            updated.push({ tenantId: scopeTenantId, document: next });
        },
    };

    return { persistence, lookups, updated };
}

function operation(
    payload: FinishDocumentRegistrationOperation['payload'],
): FinishDocumentRegistrationOperation {
    return {
        name: documentOperationNames.finishRegistration,
        schemaVersion: 1,
        intent: { id: 'intent-1', key: 'intent-key' },
        actor: { type: 'system', id: 'documents-storage', origin: {} },
        tenant: { type: 'tenant', id: tenantId },
        subject: { type: 'document', id: documentId },
        aggregate: { type: 'document', id: documentId },
        payload,
    };
}

function pending(): Document {
    return Document.pending(documentId, tenantId, 'hash-1');
}

describe('FinishDocumentRegistrationHandler', () => {
    it('registers a pending document and emits DocumentRegistered', async () => {
        const { persistence, lookups, updated } = createPersistence(pending());
        const handler = new FinishDocumentRegistrationHandler(persistence);

        const result = await handler.execute(
            operation({ outcome: 'registered', storageReference: 'storage://document-1' }),
        );

        expect(lookups).toEqual([{ tenantId, documentId }]);
        expect(updated).toHaveLength(1);
        expect(updated[0]?.tenantId).toBe(tenantId);
        expect(updated[0]?.document.status).toBe(DocumentRegistrationStatus.Registered);
        expect(updated[0]?.document.storageReference).toBe('storage://document-1');
        expect(updated[0]?.document.failureReason).toBeUndefined();
        expect(result.data).toEqual({
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
        });
        expect(result.events).toEqual([
            {
                name: documentEventNames.registered,
                schemaVersion: 1,
                payload: {
                    documentId,
                    storageReference: 'storage://document-1',
                },
            },
        ]);
    });

    it('marks a pending document failed without emitting DocumentRegistered', async () => {
        const { persistence, updated } = createPersistence(pending());
        const handler = new FinishDocumentRegistrationHandler(persistence);

        const result = await handler.execute(
            operation({ outcome: 'failed', failureReason: 'storage unavailable' }),
        );

        expect(updated).toHaveLength(1);
        expect(updated[0]?.tenantId).toBe(tenantId);
        expect(updated[0]?.document.status).toBe(DocumentRegistrationStatus.Failed);
        expect(updated[0]?.document.storageReference).toBeUndefined();
        expect(updated[0]?.document.failureReason).toBe('storage unavailable');
        expect(result.data).toEqual({
            id: documentId,
            status: DocumentRegistrationStatus.Failed,
        });
        expect(result.events).toEqual([]);
    });
});
