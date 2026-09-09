import type { ReadHandler } from '@event-driven-platform/read-handler';

import type { DocumentProcessingPersistence } from '../../ports/document-processing-persistence.js';
import type {
    GetDocumentProcessingRead,
    GetDocumentProcessingResult,
} from './get-document-processing.read.js';

export class GetDocumentProcessingReadHandler implements ReadHandler<GetDocumentProcessingRead> {
    public constructor(private readonly persistence: DocumentProcessingPersistence) {}

    public async execute(read: GetDocumentProcessingRead): Promise<GetDocumentProcessingResult | null> {
        const processing = await this.persistence.findByDocumentId(
            read.tenant.id,
            read.parameters.documentId,
        );

        if (!processing) {
            return null;
        }

        return {
            id: processing.id,
            documentId: processing.documentId,
            status: processing.status,
            ...(processing.extractedText === undefined
                ? {}
                : { extractedText: processing.extractedText }),
            ...(processing.failureReason === undefined
                ? {}
                : { failureReason: processing.failureReason }),
        };
    }
}
