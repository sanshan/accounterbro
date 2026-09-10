import 'reflect-metadata';

import { DocumentExtractor } from '@accounterbro/document-extraction';
import { NestFactory } from '@nestjs/core';

import { DocumentProcessingExtractionModule } from './document-processing-extraction.module';

describe('Document Processing extraction composition', () => {
    it('resolves the configured DocumentExtractor through Nest composition', async () => {
        const context = await NestFactory.createApplicationContext(
            DocumentProcessingExtractionModule,
            { logger: false },
        );

        try {
            const extractor = context.get(DocumentExtractor);

            expect(extractor).toBeDefined();
            expect(typeof extractor.extract).toBe('function');
        } finally {
            await context.close();
        }
    });
});
