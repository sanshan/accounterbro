import { runtimeConfig } from '@accounterbro/runtime-config';
import { registerAs } from '@nestjs/config';
import { ApiEnvSchema } from './api-env.schema';

export const CONFIG_API_TOKEN = 'api';

export function createApiConfig() {
    const env = ApiEnvSchema.parse(process.env);

    return {
        port: runtimeConfig.api.port,
        database: {
            host: env.API_DB_HOST,
            port: env.API_DB_PORT,
            username: env.API_DB_USERNAME,
            password: env.API_DB_PASSWORD,
            name: env.API_DB_NAME,
        },
    };
}

export const apiConfig = registerAs(CONFIG_API_TOKEN, createApiConfig);
