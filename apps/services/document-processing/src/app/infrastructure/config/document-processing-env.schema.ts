import { PortSchema } from '@accounterbro/runtime-config';
import { z } from 'zod';

export const DocumentProcessingEnvSchema = z.object({
    DOCUMENT_PROCESSING_DB_HOST: z.string(),
    DOCUMENT_PROCESSING_DB_PORT: PortSchema,
    DOCUMENT_PROCESSING_DB_USERNAME: z.string(),
    DOCUMENT_PROCESSING_DB_PASSWORD: z.string(),
    DOCUMENT_PROCESSING_DB_NAME: z.string(),
});
