import {
    RUNTIME_HEALTH_TYPEORM_ENTITIES,
    RUNTIME_HEALTH_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-health/typeorm';
import { DataSource } from 'typeorm';

import { createApiConfig } from '../../config/api.config';
import { createApiTypeOrmOptions } from './typeorm-options';

const config = createApiConfig();

export const AppDataSource = new DataSource({
    ...createApiTypeOrmOptions(config.database),
    entities: [
        ...RUNTIME_HEALTH_TYPEORM_ENTITIES,
        `${__dirname}/entities/*{.ts,.js}`,
    ],
    migrations: [
        ...RUNTIME_HEALTH_TYPEORM_MIGRATIONS,
        `${__dirname}/migrations/*{.ts,.js}`,
    ],
    migrationsRun: false,
});
