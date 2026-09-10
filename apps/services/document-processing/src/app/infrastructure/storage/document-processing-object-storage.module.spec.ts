import 'reflect-metadata';

import { ObjectStorage } from '@accounterbro/object-storage';
import { LocalFolderStorage } from '@accounterbro/object-storage/local-folder';
import { NestFactory } from '@nestjs/core';

import { DocumentProcessingObjectStorageModule } from './document-processing-object-storage.module';

describe('Document Processing object storage composition', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            DOCUMENT_PROCESSING_DB_HOST: 'localhost',
            DOCUMENT_PROCESSING_DB_PORT: '5432',
            DOCUMENT_PROCESSING_DB_USERNAME: 'postgres',
            DOCUMENT_PROCESSING_DB_PASSWORD: 'postgres',
            DOCUMENT_PROCESSING_DB_NAME: 'accounterbro_document_processing',
            DOCUMENT_PROCESSING_STORAGE_DRIVER: 'local-folder',
            DOCUMENT_PROCESSING_STORAGE_LOCAL_FOLDER_ROOT: '.data/documents-test',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('resolves ObjectStorage to LocalFolderStorage through Nest composition', async () => {
        const context = await NestFactory.createApplicationContext(
            DocumentProcessingObjectStorageModule,
            { logger: false },
        );

        try {
            expect(context.get(ObjectStorage)).toBeInstanceOf(LocalFolderStorage);
        } finally {
            await context.close();
        }
    });
});
