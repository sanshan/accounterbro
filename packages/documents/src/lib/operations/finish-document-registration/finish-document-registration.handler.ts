import type { OperationHandler } from '@event-driven-platform/operation-handler';
import {
    OperationResults,
    type SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';

import {
    DocumentRegisteredEventContract,
    type DocumentRegisteredEvent,
} from '../../events/document-registered/document-registered.event.js';
import type { DocumentPersistence } from '../../ports/document-persistence.js';
import type {
    FinishDocumentRegistrationOperation,
    FinishDocumentRegistrationOutcome,
} from './finish-document-registration.operation.js';

export class FinishDocumentRegistrationHandler
    implements OperationHandler<FinishDocumentRegistrationOperation>
{
    public constructor(private readonly persistence: DocumentPersistence) {}

    public async execute(
        operation: FinishDocumentRegistrationOperation,
    ): Promise<SuccessfulOperationResult<FinishDocumentRegistrationOutcome, DocumentRegisteredEvent>> {
        const document = await this.persistence.findById(
            operation.tenant.id,
            operation.aggregate.id,
        );

        if (!document) {
            throw new Error('Document registration cannot finish because the Document does not exist.');
        }

        if (operation.payload.outcome === 'registered') {
            const status = document.register(operation.payload.storageReference);
            await this.persistence.update(operation.tenant.id, document);

            const outcome = {
                id: document.id,
                status,
            } satisfies FinishDocumentRegistrationOutcome;

            const event = DocumentRegisteredEventContract.create({
                documentId: document.id,
                storageReference: operation.payload.storageReference,
            });

            return OperationResults.success({ data: outcome, events: [event] });
        }

        const status = document.fail(operation.payload.failureReason);
        await this.persistence.update(operation.tenant.id, document);

        const outcome = {
            id: document.id,
            status,
        } satisfies FinishDocumentRegistrationOutcome;

        return OperationResults.success({ data: outcome });
    }
}
