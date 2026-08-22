import type { DocumentPersistence } from '../document-persistence.js';
import type { Document } from '../document.js';
import { DOCUMENT_REGISTERED_EVENT } from '../events/document-registered.js';
import { FinishDocumentRegistrationHandler } from './finish-document-registration-handler.js';
import type { FinishDocumentRegistrationOperation } from './finish-document-registration-operation.js';

function createPersistence(document: Document | null) {
    const updated: Document[] = [];
    const persistence: DocumentPersistence = {
        findByContentHash: async () => null,
        findById: async () => document,
        insert: async () => undefined,
        update: async (next) => {
            updated.push(next);
        },
    };

    return { persistence, updated };
}

function operation(
    payload: FinishDocumentRegistrationOperation['payload'],
): FinishDocumentRegistrationOperation {
    return {
        name: 'documents.finish-registration',
        schemaVersion: 1,
        intent: { id: 'intent-1', key: 'intent-key' },
        actor: { type: 'system', id: 'documents-storage', origin: {} },
        tenant: { type: 'tenant', id: 'tenant-1' } as FinishDocumentRegistrationOperation['tenant'],
        subject: { type: 'document', id: 'document-1' },
        aggregate: { type: 'document', id: 'document-1' } as FinishDocumentRegistrationOperation['aggregate'],
        payload,
    };
}

const pending: Document = {
    id: 'document-1',
    contentHash: 'hash-1',
    status: 'PENDING',
};

describe('FinishDocumentRegistrationHandler', () => {
    it('registers a pending document and emits DocumentRegistered', async () => {
        const { persistence, updated } = createPersistence(pending);
        const handler = new FinishDocumentRegistrationHandler(persistence);

        const result = await handler.execute(
            operation({ outcome: 'registered', storageReference: 'storage://document-1' }),
        );

        expect(updated).toEqual([
            {
                ...pending,
                status: 'REGISTERED',
                storageReference: 'storage://document-1',
                failureReason: undefined,
            },
        ]);
        expect(result).toEqual({
            status: 'success',
            data: { id: 'document-1', status: 'REGISTERED' },
            events: [
                {
                    name: DOCUMENT_REGISTERED_EVENT,
                    schemaVersion: 1,
                    payload: {
                        documentId: 'document-1',
                        storageReference: 'storage://document-1',
                    },
                },
            ],
        });
    });

    it('marks a pending document failed without emitting DocumentRegistered', async () => {
        const { persistence, updated } = createPersistence(pending);
        const handler = new FinishDocumentRegistrationHandler(persistence);

        const result = await handler.execute(
            operation({ outcome: 'failed', failureReason: 'storage unavailable' }),
        );

        expect(updated).toEqual([
            {
                ...pending,
                status: 'FAILED',
                storageReference: undefined,
                failureReason: 'storage unavailable',
            },
        ]);
        expect(result).toEqual({
            status: 'success',
            data: { id: 'document-1', status: 'FAILED' },
            events: [],
        });
    });

    it('rejects finishing a document that is not pending', async () => {
        const registered: Document = {
            ...pending,
            status: 'REGISTERED',
            storageReference: 'storage://document-1',
        };
        const { persistence } = createPersistence(registered);
        const handler = new FinishDocumentRegistrationHandler(persistence);

        await expect(
            handler.execute(
                operation({ outcome: 'failed', failureReason: 'storage unavailable' }),
            ),
        ).rejects.toThrow('Document registration can only finish from PENDING state.');
    });
});
