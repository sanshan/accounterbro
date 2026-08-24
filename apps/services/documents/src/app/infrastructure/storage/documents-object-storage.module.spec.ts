import 'reflect-metadata';

import { ObjectStorage } from '@accounterbro/object-storage';
import { LocalFolderStorage } from '@accounterbro/object-storage/local-folder';
import { NestFactory } from '@nestjs/core';

import { createDocumentsConfig } from '../config/documents.config';
import { DocumentsObjectStorageModule } from './documents-object-storage.module';

describe('Documents object storage composition', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            DOCUMENTS_DB_HOST: 'localhost',
            DOCUMENTS_DB_PORT: '5432',
            DOCUMENTS_DB_USERNAME: 'postgres',
            DOCUMENTS_DB_PASSWORD: 'postgres',
            DOCUMENTS_DB_NAME: 'accounterbro_documents',
            DOCUMENTS_STORAGE_DRIVER: 'local-folder',
            DOCUMENTS_STORAGE_LOCAL_FOLDER_ROOT: '.data/documents-test',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('maps service-owned storage environment into typed Documents config', () => {
        expect(createDocumentsConfig().storage).toEqual({
            driver: 'local-folder',
            localFolder: {
                rootDirectory: '.data/documents-test',
            },
        });
    });

    it('resolves ObjectStorage to LocalFolderStorage through Nest composition', async () => {
        const context = await NestFactory.createApplicationContext(DocumentsObjectStorageModule, {
            logger: false,
        });

        try {
            expect(context.get(ObjectStorage)).toBeInstanceOf(LocalFolderStorage);
        } finally {
            await context.close();
        }
    });
});
