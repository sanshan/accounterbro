import type { DocumentId, TenantId } from '@accounterbro/core';

import { Document } from './document.aggregate.js';
import { DocumentRegistrationStatus } from './document-registration-status.js';

const documentId = 'document-1' as DocumentId;
const tenantId = 'tenant-1' as TenantId;

describe('Document', () => {
    it('registers only from pending state', () => {
        const document = Document.pending(documentId, tenantId, 'hash-1');

        document.register('storage://document-1');

        expect(document.status).toBe(DocumentRegistrationStatus.Registered);
        expect(document.storageReference).toBe('storage://document-1');
        expect(document.failureReason).toBeUndefined();
        expect(() => document.fail('storage unavailable')).toThrow(
            'Document registration can only finish from PENDING state.',
        );
    });

    it('fails only from pending state', () => {
        const document = Document.pending(documentId, tenantId, 'hash-1');

        document.fail('storage unavailable');

        expect(document.status).toBe(DocumentRegistrationStatus.Failed);
        expect(document.storageReference).toBeUndefined();
        expect(document.failureReason).toBe('storage unavailable');
        expect(() => document.register('storage://document-1')).toThrow(
            'Document registration can only finish from PENDING state.',
        );
    });

    it('rejects restored state that contradicts its registration status', () => {
        expect(() =>
            Document.restore({
                id: documentId,
                tenantId,
                contentHash: 'hash-1',
                status: DocumentRegistrationStatus.Registered,
            }),
        ).toThrow('REGISTERED Document must contain only a storage reference.');

        expect(() =>
            Document.restore({
                id: documentId,
                tenantId,
                contentHash: 'hash-1',
                status: DocumentRegistrationStatus.Failed,
            }),
        ).toThrow('FAILED Document must contain only a failure reason.');
    });
});
