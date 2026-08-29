import {
    DOCUMENTS_TYPEORM_ENTITIES,
    DOCUMENTS_TYPEORM_MIGRATIONS,
} from '@accounterbro/documents/typeorm';
import {
    RUNTIME_HEALTH_TYPEORM_ENTITIES,
    RUNTIME_HEALTH_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-health/typeorm';
import {
    EXECUTION_LOG_TYPEORM_ENTITIES,
    EXECUTION_LOG_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-executions/execution-log/typeorm';
import {
    OUTBOX_TYPEORM_ENTITIES,
    OUTBOX_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-executions/outbox/typeorm';
import {
    USE_CASE_EXECUTION_TYPEORM_ENTITIES,
    USE_CASE_EXECUTION_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-executions/use-case-execution/typeorm';
import { DataSource } from 'typeorm';

import { createDocumentsConfig } from '../../config/documents.config';
import { createDocumentsTypeOrmOptions } from './typeorm-options';

const config = createDocumentsConfig();

export const AppDataSource = new DataSource({
    ...createDocumentsTypeOrmOptions(config.database),
    entities: [
        ...DOCUMENTS_TYPEORM_ENTITIES,
        ...RUNTIME_HEALTH_TYPEORM_ENTITIES,
        ...EXECUTION_LOG_TYPEORM_ENTITIES,
        ...OUTBOX_TYPEORM_ENTITIES,
        ...USE_CASE_EXECUTION_TYPEORM_ENTITIES,
    ],
    migrations: [
        ...DOCUMENTS_TYPEORM_MIGRATIONS,
        ...RUNTIME_HEALTH_TYPEORM_MIGRATIONS,
        ...EXECUTION_LOG_TYPEORM_MIGRATIONS,
        ...OUTBOX_TYPEORM_MIGRATIONS,
        ...USE_CASE_EXECUTION_TYPEORM_MIGRATIONS,
        `${__dirname}/migrations/*{.ts,.js}`,
    ],
    migrationsRun: false,
});
