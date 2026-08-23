import type { DocumentPersistence } from '../document-persistence.js';
import type { Document } from '../document.js';
import { GET_DOCUMENT_READ } from './document-read-names.js';
import { GetDocumentReadHandler } from './get-document-read-handler.js';
import type { GetDocumentRead } from './get-document-read.js';

function createPersistence(document: Document | null): DocumentPersistence {
    return {
        createOrGetExisting: async (candidate) => ({ kind: 'created', document: candidate }),
        findById: async () => document,
        update: async () => undefined,
    };
}

function read(documentId = 'document-1'): GetDocumentRead {
    return {
        name: GET_DOCUMENT_READ,
        actor: { type: 'user', id: 'user-1', origin: {} },
        parameters: { documentId },
    };
}

describe('GetDocumentReadHandler', () => {
    it('returns only the current document id and status', async () => {
        const document: Document = {
            id: 'document-1',
            contentHash: 'internal-content-hash',
            status: 'REGISTERED',
            storageReference: 'storage://document-1',
        };
        const handler = new GetDocumentReadHandler(createPersistence(document));

        await expect(handler.execute(read())).resolves.toEqual({
            id: 'document-1',
            status: 'REGISTERED',
        });
    });

    it('returns null when the document does not exist', async () => {
        const handler = new GetDocumentReadHandler(createPersistence(null));

        await expect(handler.execute(read('missing-document'))).resolves.toBeNull();
    });
});
