import { runtimeConfig } from '@accounterbro/runtime-config';
import { registerAs } from '@nestjs/config';

import { DocumentsEnvSchema } from './documents-env.schema';

export function createDocumentsConfig() {
    const env = DocumentsEnvSchema.parse(process.env);

    return {
        port: runtimeConfig.documents.port,
        database: {
            host: env.DOCUMENTS_DB_HOST,
            port: env.DOCUMENTS_DB_PORT,
            username: env.DOCUMENTS_DB_USERNAME,
            password: env.DOCUMENTS_DB_PASSWORD,
            name: env.DOCUMENTS_DB_NAME,
        },
        storage: {
            driver: env.DOCUMENTS_STORAGE_DRIVER,
            bucket: env.DOCUMENTS_STORAGE_BUCKET,
            localFolder: {
                rootDirectory: env.DOCUMENTS_STORAGE_LOCAL_FOLDER_ROOT,
            },
        },
    };
}

export const documentsConfig = registerAs('documents', createDocumentsConfig);
