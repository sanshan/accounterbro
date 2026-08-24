import type { ConfigType } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';

import type { documentsConfig } from '../../config/documents.config';

type DocumentsDatabaseConfig = ConfigType<typeof documentsConfig>['database'];

export function createDocumentsTypeOrmOptions(database: DocumentsDatabaseConfig): DataSourceOptions {
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
