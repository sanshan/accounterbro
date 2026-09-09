import type { DocumentExtractor } from '../document-extractor.js';
import { DocumentContentDetector } from '../internal/document-content-detector.js';
import { RoutedDocumentExtractor } from '../internal/routed-document-extractor.js';
import { PhotoOcrContentExtractor } from './photo-ocr-content-extractor.js';
import { TesseractOcrEngine } from './tesseract-ocr-engine.js';

export function createPhotoOcrDocumentExtractor(): DocumentExtractor {
    return new RoutedDocumentExtractor(
        new DocumentContentDetector(),
        [new PhotoOcrContentExtractor(new TesseractOcrEngine())],
    );
}
