import type { DocumentPersistence } from '../document-persistence.js';
import type { Document } from '../document.js';
import { DOCUMENT_UPLOAD_REQUESTED_EVENT } from '../events/document-upload-requested.js';
import { PrepareDocumentRegistrationHandler } from './prepare-document-registration-handler.js';
import type { PrepareDocumentRegistrationOperation } from './prepare-document-registration-operation.js';

function createPersistence(existing: Document | null = null) {
    const attempted: Document[] = [];
    const persistence: DocumentPersistence = {
        createOrGetExisting: async (document) => {
            attempted.push(document);
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
        name: 'documents.prepare-registration',
        schemaVersion: 1,
        intent: { id: 'intent-1', key: 'intent-key' },
        actor: { type: 'user', id: 'user-1', origin: {} },
        tenant: { type: 'tenant', id: 'tenant-1' } as PrepareDocumentRegistrationOperation['tenant'],
        subject: { type: 'document', id: 'document-1' },
        aggregate: { type: 'document', id: 'document-1' } as PrepareDocumentRegistrationOperation['aggregate'],
        payload: { documentId: 'document-1', contentHash: 'hash-1' },
    };
}

describe('PrepareDocumentRegistrationHandler', () => {
    it('persists a new pending document and requests upload', async () => {
        const { persistence, attempted } = createPersistence();
        const handler = new PrepareDocumentRegistrationHandler(persistence);

        const result = await handler.execute(operation());

        expect(attempted).toEqual([
            { id: 'document-1', contentHash: 'hash-1', status: 'PENDING' },
        ]);
        expect(result).toEqual({
            status: 'success',
            data: {
                kind: 'created',
                document: { id: 'document-1', status: 'PENDING' },
            },
            events: [
                {
                    name: DOCUMENT_UPLOAD_REQUESTED_EVENT,
                    schemaVersion: 1,
                    payload: { documentId: 'document-1' },
                },
            ],
        });
    });

    it('returns the persistence winner as duplicate without requesting upload', async () => {
        const existing: Document = {
            id: 'existing-1',
            contentHash: 'hash-1',
            status: 'FAILED',
            failureReason: 'storage unavailable',
        };
        const { persistence, attempted } = createPersistence(existing);
        const handler = new PrepareDocumentRegistrationHandler(persistence);

        const result = await handler.execute(operation());

        expect(attempted).toEqual([
            { id: 'document-1', contentHash: 'hash-1', status: 'PENDING' },
        ]);
        expect(result).toEqual({
            status: 'success',
            data: {
                kind: 'duplicate',
                document: { id: 'existing-1', status: 'FAILED' },
            },
            events: [],
        });
    });
});
