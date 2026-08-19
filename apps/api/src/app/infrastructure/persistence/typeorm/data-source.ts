import { resolve } from 'node:path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ApiEnvSchema } from '../../config/api-env.schema';

config({
    path: resolve(__dirname, '../../../../../../../.env'),
    quiet: true,
});

const env = ApiEnvSchema.parse(process.env);

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: false,
    logging: false,
    entities: [`${__dirname}/entities/*{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
    migrationsRun: false,
});
