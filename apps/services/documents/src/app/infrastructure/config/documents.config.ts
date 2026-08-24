import { registerAs } from '@nestjs/config';

import { DocumentsEnvSchema } from './documents-env.schema';

export function createDocumentsConfig() {
    const env = DocumentsEnvSchema.parse(process.env);

    return {
        database: {
            host: env.DOCUMENTS_DB_HOST,
            port: env.DOCUMENTS_DB_PORT,
            username: env.DOCUMENTS_DB_USERNAME,
            password: env.DOCUMENTS_DB_PASSWORD,
            name: env.DOCUMENTS_DB_NAME,
        },
    };
}

export const documentsConfig = registerAs('documents', createDocumentsConfig);
