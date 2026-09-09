import type { OperationHandler } from '@event-driven-platform/operation-handler';
import {
    OperationResults,
    type SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';

import { DocumentProcessing } from '../../document-processing/document-processing.aggregate.js';
import type { DocumentProcessingPersistence } from '../../ports/document-processing-persistence.js';
import type {
    PrepareDocumentProcessingOperation,
    PrepareDocumentProcessingOutcome,
} from './prepare-document-processing.operation.js';

export class PrepareDocumentProcessingHandler
    implements OperationHandler<PrepareDocumentProcessingOperation>
{
    public constructor(private readonly persistence: DocumentProcessingPersistence) {}

    public async execute(
        operation: PrepareDocumentProcessingOperation,
    ): Promise<SuccessfulOperationResult<PrepareDocumentProcessingOutcome>> {
        const processing = DocumentProcessing.pending(
            operation.payload.processingId,
            operation.tenant.id,
            operation.payload.documentId,
        );
        const creation = await this.persistence.createOrGetExisting(operation.tenant.id, processing);

        if (creation.kind === 'existing') {
            const outcome = {
                kind: 'existing',
                processing: {
                    id: creation.processing.id,
                    documentId: creation.processing.documentId,
                    status: creation.processing.status,
                },
            } satisfies PrepareDocumentProcessingOutcome;

            return OperationResults.success({ data: outcome });
        }

        const outcome = {
            kind: 'created',
            processing: {
                id: creation.processing.id,
                documentId: creation.processing.documentId,
                status: creation.processing.status,
            },
        } satisfies PrepareDocumentProcessingOutcome;

        return OperationResults.success({ data: outcome });
    }
}
