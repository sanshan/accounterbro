import type { DocumentExtractionResult } from '../document-extractor.js';
import type {
    DetectedDocumentRepresentation,
} from '../internal/document-content-detector.js';
import type { DetectedContentExtractor } from '../internal/routed-document-extractor.js';
import type { OcrEngine } from './tesseract-ocr-engine.js';

export class PhotoOcrContentExtractor implements DetectedContentExtractor {
    public constructor(private readonly ocrEngine: OcrEngine) {}

    public supports(representation: DetectedDocumentRepresentation): boolean {
        return representation === 'jpeg';
    }

    public async extract(
        content: Uint8Array,
        _representation: DetectedDocumentRepresentation,
    ): Promise<DocumentExtractionResult> {
        const text = await this.ocrEngine.recognize(content);

        return { text };
    }
}
