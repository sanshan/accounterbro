import type { OperationHandler } from '@event-driven-platform/operation-handler';
import { OperationResults } from '@event-driven-platform/operation-result';

import type { DocumentPersistence } from '../document-persistence.js';
import type { Document } from '../document.js';
import { DOCUMENT_UPLOAD_REQUESTED_EVENT } from '../events/document-upload-requested.js';
import type { PrepareDocumentRegistrationOperation } from './prepare-document-registration-operation.js';

export class PrepareDocumentRegistrationHandler
    implements OperationHandler<PrepareDocumentRegistrationOperation>
{
    public constructor(private readonly persistence: DocumentPersistence) {}

    public async execute(operation: PrepareDocumentRegistrationOperation) {
        const existing = await this.persistence.findByContentHash(operation.payload.contentHash);

        if (existing) {
            return OperationResults.success({
                data: {
                    kind: 'duplicate',
                    document: {
                        id: existing.id,
                        status: existing.status,
                    },
                },
            });
        }

        const document: Document = {
            id: operation.payload.documentId,
            contentHash: operation.payload.contentHash,
            status: 'PENDING',
        };

        await this.persistence.insert(document);

        return OperationResults.success({
            data: {
                kind: 'created',
                document: {
                    id: document.id,
                    status: document.status,
                },
            },
            events: [
                {
                    name: DOCUMENT_UPLOAD_REQUESTED_EVENT,
                    schemaVersion: 1,
                    payload: { documentId: document.id },
                },
            ],
        });
    }
}
