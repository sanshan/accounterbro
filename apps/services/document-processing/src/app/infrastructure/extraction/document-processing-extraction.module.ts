import { DocumentExtractor } from '@accounterbro/document-extraction';
import { createPhotoOcrDocumentExtractor } from '@accounterbro/document-extraction/photo-ocr';
import { Module } from '@nestjs/common';

@Module({
    providers: [
        {
            provide: DocumentExtractor,
            useFactory: createPhotoOcrDocumentExtractor,
        },
    ],
    exports: [DocumentExtractor],
})
export class DocumentProcessingExtractionModule {}
