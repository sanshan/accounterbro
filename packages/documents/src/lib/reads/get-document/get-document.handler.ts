import type { ReadHandler } from '@event-driven-platform/read-handler';

import type { DocumentPersistence } from '../../ports/document-persistence.js';
import type { GetDocumentRead, GetDocumentResult } from './get-document.read.js';

export class GetDocumentReadHandler implements ReadHandler<GetDocumentRead> {
    public constructor(private readonly persistence: DocumentPersistence) {}

    public async execute(read: GetDocumentRead): Promise<GetDocumentResult | null> {
        const document = await this.persistence.findById(read.parameters.documentId);

        if (!document) {
            return null;
        }

        return {
            id: document.id,
            status: document.status,
        };
    }
}
