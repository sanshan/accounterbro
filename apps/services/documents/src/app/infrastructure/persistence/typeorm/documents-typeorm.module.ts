import {
    DOCUMENTS_TYPEORM_ENTITIES,
    DocumentPersistence,
} from '@accounterbro/documents/typeorm';
import { RUNTIME_HEALTH_TYPEORM_ENTITIES } from '@accounterbro/runtime-health/typeorm';
import {
    EXECUTION_LOG_TYPEORM_ENTITIES,
    createExecutionLogStore,
} from '@accounterbro/runtime-executions/execution-log/typeorm';
import {
    OUTBOX_TYPEORM_ENTITIES,
    createOutboxStore,
} from '@accounterbro/runtime-executions/outbox/typeorm';
import {
    TypeOrmExecutionTransaction,
    TypeOrmTransactionContext,
    createTransactionAwareDataSource,
} from '@accounterbro/runtime-executions/typeorm';
import {
    USE_CASE_EXECUTION_TYPEORM_ENTITIES,
    createUseCaseExecutionStore,
} from '@accounterbro/runtime-executions/use-case-execution/typeorm';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DocumentsConfigModule } from '../../config/documents-config.module';
import { documentsConfig } from '../../config/documents.config';
import {
    EXECUTION_LOG_STORE,
    OUTBOX_STORE,
    TRANSACTION_AWARE_DATA_SOURCE,
    USE_CASE_EXECUTION_STORE,
} from '../../runtime/runtime.tokens';
import { documentsTypeOrmProviders } from './providers/documents/documents.providers';
import { createDocumentsTypeOrmOptions } from './typeorm-options';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [DocumentsConfigModule],
            inject: [documentsConfig.KEY],
            useFactory: (config: ConfigType<typeof documentsConfig>) => ({
                ...createDocumentsTypeOrmOptions(config.database),
                autoLoadEntities: true,
            }),
        }),
        TypeOrmModule.forFeature([
            ...DOCUMENTS_TYPEORM_ENTITIES,
            ...RUNTIME_HEALTH_TYPEORM_ENTITIES,
            ...EXECUTION_LOG_TYPEORM_ENTITIES,
            ...OUTBOX_TYPEORM_ENTITIES,
            ...USE_CASE_EXECUTION_TYPEORM_ENTITIES,
        ]),
    ],
    providers: [
        {
            provide: TypeOrmTransactionContext,
            useFactory: () => new TypeOrmTransactionContext(),
        },
        {
            provide: TRANSACTION_AWARE_DATA_SOURCE,
            inject: [DataSource, TypeOrmTransactionContext],
            useFactory: (dataSource: DataSource, context: TypeOrmTransactionContext) =>
                createTransactionAwareDataSource(dataSource, context),
        },
        {
            provide: TypeOrmExecutionTransaction,
            inject: [DataSource, TypeOrmTransactionContext],
            useFactory: (dataSource: DataSource, context: TypeOrmTransactionContext) =>
                new TypeOrmExecutionTransaction(dataSource, context),
        },
        ...documentsTypeOrmProviders,
        {
            provide: EXECUTION_LOG_STORE,
            inject: [TRANSACTION_AWARE_DATA_SOURCE],
            useFactory: createExecutionLogStore,
        },
        {
            provide: OUTBOX_STORE,
            inject: [TRANSACTION_AWARE_DATA_SOURCE],
            useFactory: createOutboxStore,
        },
        {
            provide: USE_CASE_EXECUTION_STORE,
            inject: [DataSource],
            useFactory: createUseCaseExecutionStore,
        },
    ],
    exports: [
        TypeOrmModule,
        DocumentPersistence,
        TypeOrmTransactionContext,
        TypeOrmExecutionTransaction,
        TRANSACTION_AWARE_DATA_SOURCE,
        EXECUTION_LOG_STORE,
        OUTBOX_STORE,
        USE_CASE_EXECUTION_STORE,
    ],
})
export class DocumentsTypeormModule {}
