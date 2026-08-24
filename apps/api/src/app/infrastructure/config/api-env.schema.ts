import { PortSchema } from '@accounterbro/runtime-config';
import { z } from 'zod';

export const ApiEnvSchema = z.object({
    API_DB_HOST: z.string(),
    API_DB_PORT: PortSchema,
    API_DB_USERNAME: z.string(),
    API_DB_PASSWORD: z.string(),
    API_DB_NAME: z.string(),
});
