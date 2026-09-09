import { DocumentExtractionError } from '../document-extraction-error.js';
import {
    DocumentExtractor,
    type DocumentExtractionResult,
} from '../document-extractor.js';
import type {
    DocumentContentDetector,
    DetectedDocumentRepresentation,
} from './document-content-detector.js';

export interface DetectedContentExtractor {
    supports(representation: DetectedDocumentRepresentation): boolean;
    extract(
        content: Uint8Array,
        representation: DetectedDocumentRepresentation,
    ): Promise<DocumentExtractionResult>;
}

export class RoutedDocumentExtractor extends DocumentExtractor {
    public constructor(
        private readonly detector: DocumentContentDetector,
        private readonly extractors: readonly DetectedContentExtractor[],
    ) {
        super();
    }

    public override async extract(content: Uint8Array): Promise<DocumentExtractionResult> {
        const representation = this.detector.detect(content);

        if (!representation) {
            throw unsupportedContentError();
        }

        const extractor = this.extractors.find((candidate) =>
            candidate.supports(representation),
        );

        if (!extractor) {
            throw unsupportedContentError();
        }

        try {
            return await extractor.extract(content, representation);
        } catch (error: unknown) {
            if (error instanceof DocumentExtractionError) {
                throw error;
            }

            throw new DocumentExtractionError(
                'extraction-failed',
                'Document extraction failed.',
                { cause: error },
            );
        }
    }
}

function unsupportedContentError(): DocumentExtractionError {
    return new DocumentExtractionError(
        'unsupported-content',
        'Unsupported document content.',
    );
}
