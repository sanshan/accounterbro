import { PortSchema } from '@accounterbro/runtime-config';
import { z } from 'zod';

export const DocumentsEnvSchema = z.object({
    DOCUMENTS_DB_HOST: z.string(),
    DOCUMENTS_DB_PORT: PortSchema,
    DOCUMENTS_DB_USERNAME: z.string(),
    DOCUMENTS_DB_PASSWORD: z.string(),
    DOCUMENTS_DB_NAME: z.string(),
    DOCUMENTS_STORAGE_DRIVER: z.literal('local-folder'),
    DOCUMENTS_STORAGE_BUCKET: z.string().min(1),
    DOCUMENTS_STORAGE_LOCAL_FOLDER_ROOT: z.string().min(1),
});
