import type { OperationHandler } from '@event-driven-platform/operation-handler';
import {
    OperationResults,
    type SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';

import { Document } from '../../document/document.aggregate.js';
import type { DocumentPersistence } from '../../ports/document-persistence.js';
import type {
    PrepareDocumentRegistrationOperation,
    PrepareDocumentRegistrationOutcome,
} from './prepare-document-registration.operation.js';

export class PrepareDocumentRegistrationHandler
    implements OperationHandler<PrepareDocumentRegistrationOperation>
{
    public constructor(private readonly persistence: DocumentPersistence) {}

    public async execute(
        operation: PrepareDocumentRegistrationOperation,
    ): Promise<SuccessfulOperationResult<PrepareDocumentRegistrationOutcome>> {
        const document = Document.pending(
            operation.payload.documentId,
            operation.tenant.id,
            operation.payload.contentHash,
        );
        const creation = await this.persistence.createOrGetExisting(operation.tenant.id, document);

        if (creation.kind === 'existing') {
            const outcome = {
                kind: 'duplicate',
                document: {
                    id: creation.document.id,
                    status: creation.document.status,
                },
            } satisfies PrepareDocumentRegistrationOutcome;

            return OperationResults.success({ data: outcome });
        }

        const outcome = {
            kind: 'created',
            document: {
                id: creation.document.id,
                status: creation.document.status,
            },
        } satisfies PrepareDocumentRegistrationOutcome;

        return OperationResults.success({ data: outcome });
    }
}
