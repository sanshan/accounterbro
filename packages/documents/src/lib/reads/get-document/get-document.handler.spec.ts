import {
    tenantName,
    type DocumentId,
    type TenantId,
    type TenantReference,
} from '@accounterbro/core';

import { Document } from '../../document/document.aggregate.js';
import { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import type { DocumentPersistence } from '../../ports/document-persistence.js';
import { documentReadNames } from '../names.js';
import { GetDocumentReadHandler } from './get-document.handler.js';
import type { GetDocumentRead } from './get-document.read.js';

const documentId = 'document-1' as DocumentId;
const tenant = {
    type: tenantName,
    id: 'tenant-1' as TenantId,
} satisfies TenantReference;

function createPersistence(document: Document | null) {
    const lookups: Array<{ readonly tenantId: TenantId; readonly documentId: DocumentId }> = [];
    const persistence: DocumentPersistence = {
        createOrGetExisting: async (_tenantId, candidate) => ({
            kind: 'created',
            document: candidate,
        }),
        findById: async (tenantId, requestedDocumentId) => {
            lookups.push({ tenantId, documentId: requestedDocumentId });
            return document;
        },
        update: async () => undefined,
    };

    return { persistence, lookups };
}

function read(id: DocumentId = documentId): GetDocumentRead {
    return {
        name: documentReadNames.getDocument,
        actor: { type: 'user', id: 'user-1', origin: {} },
        tenant,
        parameters: { documentId: id },
    };
}

describe('GetDocumentReadHandler', () => {
    it('returns only the current document id and status', async () => {
        const document = Document.restore({
            id: documentId,
            tenantId: tenant.id,
            contentHash: 'internal-content-hash',
            status: DocumentRegistrationStatus.Registered,
            storageReference: 'storage://document-1',
        });
        const { persistence, lookups } = createPersistence(document);
        const handler = new GetDocumentReadHandler(persistence);

        await expect(handler.execute(read())).resolves.toEqual({
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
        });
        expect(lookups).toEqual([{ tenantId: tenant.id, documentId }]);
    });

    it('returns null when the document does not exist', async () => {
        const { persistence } = createPersistence(null);
        const handler = new GetDocumentReadHandler(persistence);
        const missingDocumentId = 'missing-document' as DocumentId;

        await expect(handler.execute(read(missingDocumentId))).resolves.toBeNull();
    });
});
