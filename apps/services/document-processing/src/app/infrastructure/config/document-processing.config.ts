import { runtimeConfig } from '@accounterbro/runtime-config';
import { registerAs } from '@nestjs/config';

import { DocumentProcessingEnvSchema } from './document-processing-env.schema';

export function createDocumentProcessingConfig() {
    const env = DocumentProcessingEnvSchema.parse(process.env);

    return {
        port: runtimeConfig.documentProcessing.port,
        database: {
            host: env.DOCUMENT_PROCESSING_DB_HOST,
            port: env.DOCUMENT_PROCESSING_DB_PORT,
            username: env.DOCUMENT_PROCESSING_DB_USERNAME,
            password: env.DOCUMENT_PROCESSING_DB_PASSWORD,
            name: env.DOCUMENT_PROCESSING_DB_NAME,
        },
    };
}

export const documentProcessingConfig = registerAs('document-processing', createDocumentProcessingConfig);
