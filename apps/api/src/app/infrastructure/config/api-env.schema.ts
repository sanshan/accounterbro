import { PortSchema } from '@application-template/runtime-config';
import { z } from 'zod';

export const ApiEnvSchema = z.object({
    DB_HOST: z.string(),
    DB_PORT: PortSchema,
    DB_USERNAME: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
});
