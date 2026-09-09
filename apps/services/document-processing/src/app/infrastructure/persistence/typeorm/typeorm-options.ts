import type { ConfigType } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';

import type { documentProcessingConfig } from '../../config/document-processing.config';

type DocumentProcessingDatabaseConfig = ConfigType<typeof documentProcessingConfig>['database'];

export function createDocumentProcessingTypeOrmOptions(database: DocumentProcessingDatabaseConfig): DataSourceOptions {
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
