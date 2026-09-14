import type { DocumentId } from '@accounterbro/core';
import { DocumentRegisteredEventContract } from '@accounterbro/documents';
import { createSubscription } from '@accounterbro/runtime-presenters/events';
import { z } from 'zod';

import type { ProcessDocumentUseCase } from '../../application/use-cases/process-document/process-document.use-case';

const documentIdSchema = z.uuid();

export function createDocumentRegisteredSubscription(useCase: ProcessDocumentUseCase) {
    return createSubscription({
        contract: DocumentRegisteredEventContract,
        useCase,
        intentSlot: 'process-document',
        mapInput: (event) => ({
            documentId: documentIdSchema.parse(event.payload.documentId) as DocumentId,
            storageReference: event.payload.storageReference,
        }),
    });
}
