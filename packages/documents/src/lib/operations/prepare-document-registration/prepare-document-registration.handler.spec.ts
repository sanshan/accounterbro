import type { DocumentId, TenantId } from '@accounterbro/core';

import { Document } from '../../document/document.aggregate.js';
import { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import { documentOperationNames } from '../names.js';
import type { DocumentPersistence } from '../../ports/document-persistence.js';
import { PrepareDocumentRegistrationHandler } from './prepare-document-registration.handler.js';
import type { PrepareDocumentRegistrationOperation } from './prepare-document-registration.operation.js';

const documentId = 'document-1' as DocumentId;
const tenantId = 'tenant-1' as TenantId;

function createPersistence(existing: Document | null = null) {
    const attempted: Array<{ readonly tenantId: TenantId; readonly document: Document }> = [];
    const persistence: DocumentPersistence = {
        createOrGetExisting: async (scopeTenantId, document) => {
            attempted.push({ tenantId: scopeTenantId, document });
            return existing
                ? { kind: 'existing', document: existing }
                : { kind: 'created', document };
        },
        findById: async () => null,
        update: async () => undefined,
    };

    return { persistence, attempted };
}

function operation(): PrepareDocumentRegistrationOperation {
    return {
        name: documentOperationNames.prepareRegistration,
        schemaVersion: 1,
        intent: { id: 'intent-1', key: 'intent-key' },
        actor: { type: 'user', id: 'user-1', origin: {} },
        tenant: { type: 'tenant', id: tenantId },
        subject: { type: 'document', id: documentId },
        aggregate: { type: 'document', id: documentId },
        payload: { documentId, contentHash: 'hash-1' },
    };
}

describe('PrepareDocumentRegistrationHandler', () => {
    it('persists a new pending document without emitting an upload continuation', async () => {
        const { persistence, attempted } = createPersistence();
        const handler = new PrepareDocumentRegistrationHandler(persistence);

        const result = await handler.execute(operation());

        expect(attempted).toHaveLength(1);
        expect(attempted[0]?.tenantId).toBe(tenantId);
        expect(attempted[0]?.document.id).toBe(documentId);
        expect(attempted[0]?.document.tenantId).toBe(tenantId);
        expect(attempted[0]?.document.contentHash).toBe('hash-1');
        expect(attempted[0]?.document.status).toBe(DocumentRegistrationStatus.Pending);
        expect(result.data).toEqual({
            kind: 'created',
            document: { id: documentId, status: DocumentRegistrationStatus.Pending },
        });
        expect(result.events).toEqual([]);
    });

    it('returns the persistence winner as duplicate without emitting events', async () => {
        const existingId = 'existing-1' as DocumentId;
        const existing = Document.restore({
            id: existingId,
            tenantId,
            contentHash: 'hash-1',
            status: DocumentRegistrationStatus.Failed,
            failureReason: 'storage unavailable',
        });
        const { persistence, attempted } = createPersistence(existing);
        const handler = new PrepareDocumentRegistrationHandler(persistence);

        const result = await handler.execute(operation());

        expect(attempted).toHaveLength(1);
        expect(attempted[0]?.tenantId).toBe(tenantId);
        expect(attempted[0]?.document.id).toBe(documentId);
        expect(result.data).toEqual({
            kind: 'duplicate',
            document: { id: existingId, status: DocumentRegistrationStatus.Failed },
        });
        expect(result.events).toEqual([]);
    });
});
