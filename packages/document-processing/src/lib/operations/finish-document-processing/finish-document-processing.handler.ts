import type { OperationHandler } from '@event-driven-platform/operation-handler';
import {
    OperationResults,
    type SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';

import {
    DocumentProcessingCompletedEventContract,
    type DocumentProcessingCompletedEvent,
} from '../../events/document-processing-completed/document-processing-completed.event.js';
import type { DocumentProcessingPersistence } from '../../ports/document-processing-persistence.js';
import type {
    FinishDocumentProcessingOperation,
    FinishDocumentProcessingOutcome,
} from './finish-document-processing.operation.js';

export class FinishDocumentProcessingHandler
    implements OperationHandler<FinishDocumentProcessingOperation>
{
    public constructor(private readonly persistence: DocumentProcessingPersistence) {}

    public async execute(
        operation: FinishDocumentProcessingOperation,
    ): Promise<SuccessfulOperationResult<FinishDocumentProcessingOutcome, DocumentProcessingCompletedEvent>> {
        const processing = await this.persistence.findById(
            operation.tenant.id,
            operation.aggregate.id,
        );

        if (!processing) {
            throw new Error(
                'Document processing cannot finish because the DocumentProcessing does not exist.',
            );
        }

        if (operation.payload.outcome === 'completed') {
            const status = processing.complete(operation.payload.extractedText);
            await this.persistence.update(operation.tenant.id, processing);

            const outcome = {
                id: processing.id,
                status,
            } satisfies FinishDocumentProcessingOutcome;

            const event = DocumentProcessingCompletedEventContract.create({
                processingId: processing.id,
                documentId: processing.documentId,
            });

            return OperationResults.success({ data: outcome, events: [event] });
        }

        const status = processing.fail(operation.payload.failureReason);
        await this.persistence.update(operation.tenant.id, processing);

        const outcome = {
            id: processing.id,
            status,
        } satisfies FinishDocumentProcessingOutcome;

        return OperationResults.success({ data: outcome });
    }
}
