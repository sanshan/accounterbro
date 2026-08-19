import { runtimeConfig } from '@application-template/runtime-config';
import { registerAs } from '@nestjs/config';
import { ApiEnvSchema } from './api-env.schema';

export const CONFIG_API_TOKEN = 'api';

export const apiConfig = registerAs(CONFIG_API_TOKEN, () => {
    const env = ApiEnvSchema.parse(process.env);

    return {
        port: runtimeConfig.api.port,
        database: {
            host: env.DB_HOST,
            port: env.DB_PORT,
            username: env.DB_USERNAME,
            password: env.DB_PASSWORD,
            name: env.DB_NAME,
        },
    };
});
