import { DataSource } from 'typeorm';

import { createDocumentProcessingConfig } from '../../config/document-processing.config';
import { createDocumentProcessingTypeOrmOptions } from './typeorm-options';

const config = createDocumentProcessingConfig();

export const AppDataSource = new DataSource({
    ...createDocumentProcessingTypeOrmOptions(config.database),
    entities: [`${__dirname}/entities/*{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
    migrationsRun: false,
});
