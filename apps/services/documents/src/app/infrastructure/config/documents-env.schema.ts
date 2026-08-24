import { PortSchema } from '@accounterbro/runtime-config';
import { z } from 'zod';

export const DocumentsEnvSchema = z.object({
    DOCUMENTS_DB_HOST: z.string(),
    DOCUMENTS_DB_PORT: PortSchema,
    DOCUMENTS_DB_USERNAME: z.string(),
    DOCUMENTS_DB_PASSWORD: z.string(),
    DOCUMENTS_DB_NAME: z.string(),
});
