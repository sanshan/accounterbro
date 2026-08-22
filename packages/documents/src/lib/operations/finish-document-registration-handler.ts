import type { OperationHandler } from '@event-driven-platform/operation-handler';
import { OperationResults } from '@event-driven-platform/operation-result';

import type { DocumentPersistence } from '../document-persistence.js';
import { DOCUMENT_REGISTERED_EVENT } from '../events/document-registered.js';
import type { FinishDocumentRegistrationOperation } from './finish-document-registration-operation.js';

export class FinishDocumentRegistrationHandler
    implements OperationHandler<FinishDocumentRegistrationOperation>
{
    public constructor(private readonly persistence: DocumentPersistence) {}

    public async execute(operation: FinishDocumentRegistrationOperation) {
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

            return OperationResults.success({
                data: { id: registered.id, status: registered.status },
                events: [
                    {
                        name: DOCUMENT_REGISTERED_EVENT,
                        schemaVersion: 1,
                        payload: {
                            documentId: registered.id,
                            storageReference: registered.storageReference,
                        },
                    },
                ],
            });
        }

        const failed = {
            ...document,
            status: 'FAILED' as const,
            storageReference: undefined,
            failureReason: operation.payload.failureReason,
        };

        await this.persistence.update(failed);

        return OperationResults.success({
            data: { id: failed.id, status: failed.status },
        });
    }
}
