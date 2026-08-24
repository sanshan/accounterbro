import { DataSource } from 'typeorm';

import { createDocumentsConfig } from '../../config/documents.config';
import { createDocumentsTypeOrmOptions } from './typeorm-options';

const config = createDocumentsConfig();

export const AppDataSource = new DataSource({
    ...createDocumentsTypeOrmOptions(config.database),
    entities: [`${__dirname}/entities/*{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
    migrationsRun: false,
});
