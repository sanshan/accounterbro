import type { OperationHandler } from '@event-driven-platform/operation-handler';
import {
    OperationResults,
    type SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';

import type { DocumentPersistence } from '../document-persistence.js';
import {
    DOCUMENT_REGISTERED_EVENT,
    type DocumentRegistered,
} from '../events/document-registered.js';
import type {
    FinishDocumentRegistrationOperation,
    FinishDocumentRegistrationOutcome,
} from './finish-document-registration-operation.js';

export class FinishDocumentRegistrationHandler
    implements OperationHandler<FinishDocumentRegistrationOperation>
{
    public constructor(private readonly persistence: DocumentPersistence) {}

    public async execute(
        operation: FinishDocumentRegistrationOperation,
    ): Promise<SuccessfulOperationResult<FinishDocumentRegistrationOutcome, DocumentRegistered>> {
        const document = await this.persistence.findById(operation.aggregate.id);

        if (!document || document.status !== 'PENDING') {
            throw new Error('Document registration can only finish from PENDING state.');
        }

        if (operation.payload.outcome === 'registered') {
            const registered = {
                ...document,
                status: 'REGISTERED' as const,
                storageReference: operation.payload.storageReference,
                failureReason: undefined,
            };

            await this.persistence.update(registered);

            const outcome = {
                id: registered.id,
                status: registered.status,
            } satisfies FinishDocumentRegistrationOutcome;

            const event = {
                name: DOCUMENT_REGISTERED_EVENT,
                schemaVersion: 1,
                payload: {
                    documentId: registered.id,
                    storageReference: registered.storageReference,
                },
            } satisfies DocumentRegistered;

            return OperationResults.success({
                data: outcome,
                events: [event],
            });
        }

        const failed = {
            ...document,
            status: 'FAILED' as const,
            storageReference: undefined,
            failureReason: operation.payload.failureReason,
        };

        await this.persistence.update(failed);

        const outcome = {
            id: failed.id,
            status: failed.status,
        } satisfies FinishDocumentRegistrationOutcome;

        return OperationResults.success({ data: outcome });
    }
}
