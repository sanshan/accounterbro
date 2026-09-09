import convertHeic from 'heic-convert';

import type { DocumentExtractionResult } from '../document-extractor.js';
import type {
    DetectedDocumentRepresentation,
} from '../internal/document-content-detector.js';
import type { DetectedContentExtractor } from '../internal/routed-document-extractor.js';
import type { OcrEngine } from './tesseract-ocr-engine.js';

export class PhotoOcrContentExtractor implements DetectedContentExtractor {
    public constructor(private readonly ocrEngine: OcrEngine) {}

    public supports(representation: DetectedDocumentRepresentation): boolean {
        return representation === 'jpeg' || representation === 'heif';
    }

    public async extract(
        content: Uint8Array,
        representation: DetectedDocumentRepresentation,
    ): Promise<DocumentExtractionResult> {
        const normalizedContent = await normalizeForOcr(content, representation);
        const text = await this.ocrEngine.recognize(normalizedContent);

        return { text };
    }
}

async function normalizeForOcr(
    content: Uint8Array,
    representation: DetectedDocumentRepresentation,
): Promise<Uint8Array> {
    if (representation === 'jpeg') {
        return content;
    }

    return convertHeic({
        buffer: content,
        format: 'PNG',
    });
}
