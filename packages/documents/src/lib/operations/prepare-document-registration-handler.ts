import type { OperationHandler } from '@event-driven-platform/operation-handler';
import {
    OperationResults,
    type SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';

import type { DocumentPersistence } from '../document-persistence.js';
import type { Document } from '../document.js';
import {
    DOCUMENT_UPLOAD_REQUESTED_EVENT,
    type DocumentUploadRequested,
} from '../events/document-upload-requested.js';
import type {
    PrepareDocumentRegistrationOperation,
    PrepareDocumentRegistrationOutcome,
} from './prepare-document-registration-operation.js';

export class PrepareDocumentRegistrationHandler
    implements OperationHandler<PrepareDocumentRegistrationOperation>
{
    public constructor(private readonly persistence: DocumentPersistence) {}

    public async execute(
        operation: PrepareDocumentRegistrationOperation,
    ): Promise<SuccessfulOperationResult<PrepareDocumentRegistrationOutcome, DocumentUploadRequested>> {
        const existing = await this.persistence.findByContentHash(operation.payload.contentHash);

        if (existing) {
            const outcome = {
                kind: 'duplicate',
                document: {
                    id: existing.id,
                    status: existing.status,
                },
            } satisfies PrepareDocumentRegistrationOutcome;

            return OperationResults.success({ data: outcome });
        }

        const document: Document = {
            id: operation.payload.documentId,
            contentHash: operation.payload.contentHash,
            status: 'PENDING',
        };

        await this.persistence.insert(document);

        const outcome = {
            kind: 'created',
            document: {
                id: document.id,
                status: document.status,
            },
        } satisfies PrepareDocumentRegistrationOutcome;

        const event = {
            name: DOCUMENT_UPLOAD_REQUESTED_EVENT,
            schemaVersion: 1,
            payload: { documentId: document.id },
        } satisfies DocumentUploadRequested;

        return OperationResults.success({
            data: outcome,
            events: [event],
        });
    }
}
