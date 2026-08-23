import type { DocumentId } from '@accounterbro/core';

import { Document } from '../../document/document.aggregate.js';
import { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import type { DocumentPersistence } from '../../ports/document-persistence.js';
import { documentReadNames } from '../names.js';
import { GetDocumentReadHandler } from './get-document.handler.js';
import type { GetDocumentRead } from './get-document.read.js';

const documentId = 'document-1' as DocumentId;

function createPersistence(document: Document | null): DocumentPersistence {
    return {
        createOrGetExisting: async (candidate) => ({ kind: 'created', document: candidate }),
        findById: async () => document,
        update: async () => undefined,
    };
}

function read(id: DocumentId = documentId): GetDocumentRead {
    return {
        name: documentReadNames.getDocument,
        actor: { type: 'user', id: 'user-1', origin: {} },
        parameters: { documentId: id },
    };
}

describe('GetDocumentReadHandler', () => {
    it('returns only the current document id and status', async () => {
        const document = Document.restore({
            id: documentId,
            contentHash: 'internal-content-hash',
            status: DocumentRegistrationStatus.Registered,
            storageReference: 'storage://document-1',
        });
        const handler = new GetDocumentReadHandler(createPersistence(document));

        await expect(handler.execute(read())).resolves.toEqual({
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
        });
    });

    it('returns null when the document does not exist', async () => {
        const handler = new GetDocumentReadHandler(createPersistence(null));
        const missingDocumentId = 'missing-document' as DocumentId;

        await expect(handler.execute(read(missingDocumentId))).resolves.toBeNull();
    });
});
