import { DataSource } from 'typeorm';

import { createApiConfig } from '../../config/api.config';
import { createApiTypeOrmOptions } from './typeorm-options';

const config = createApiConfig();

export const AppDataSource = new DataSource({
    ...createApiTypeOrmOptions(config.database),
    entities: [`${__dirname}/entities/*{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
    migrationsRun: false,
});
