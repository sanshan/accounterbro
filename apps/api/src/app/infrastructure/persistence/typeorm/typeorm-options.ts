import type { ConfigType } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';

import type { apiConfig } from '../../config/api.config';

type ApiDatabaseConfig = ConfigType<typeof apiConfig>['database'];

export function createApiTypeOrmOptions(database: ApiDatabaseConfig): DataSourceOptions {
    return {
        type: 'postgres',
        host: database.host,
        port: database.port,
        username: database.username,
        password: database.password,
        database: database.name,
        synchronize: false,
        logging: false,
    };
}
