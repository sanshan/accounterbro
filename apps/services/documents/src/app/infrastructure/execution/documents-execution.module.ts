import { randomUUID } from 'node:crypto';

import {
    DOCUMENTS_OPERATION_HANDLER_BINDINGS,
    documentsOperationHandlerBindingsProvider,
    documentsOperationHandlerProviders,
} from '@accounterbro/documents/execution';
import {
    MapOperationHandlerResolver,
    OperationHandlerResolver,
    type OperationHandlerBinding,
} from '@accounterbro/service-runtime';
import type { createExecutionLogStore } from '@accounterbro/service-runtime/execution-log/typeorm';
import type { createOutboxStore } from '@accounterbro/service-runtime/outbox/typeorm';
import { createServiceRunner } from '@accounterbro/service-runtime/runner';
import { TypeOrmExecutionTransaction } from '@accounterbro/service-runtime/typeorm';
import type { createUseCaseExecutionStore } from '@accounterbro/service-runtime/use-case-execution/typeorm';
import { createServiceUseCaseExecutor } from '@accounterbro/service-runtime/use-case-executor';
import { SystemClock } from '@event-driven-platform/clock';
import type { ExecutionLeaseOwnerId } from '@event-driven-platform/execution';
import { Module } from '@nestjs/common';

import { DocumentsTypeormModule } from '../persistence/typeorm/documents-typeorm.module';
import {
    DOCUMENTS_RUNNER,
    DOCUMENTS_USE_CASE_EXECUTOR,
    EXECUTION_LEASE_OWNER_ID,
    EXECUTION_LOG_STORE,
    OUTBOX_STORE,
    USE_CASE_EXECUTION_STORE,
} from '../runtime/runtime.tokens';

type ExecutionLogStore = ReturnType<typeof createExecutionLogStore>;
type OutboxStore = ReturnType<typeof createOutboxStore>;
type UseCaseExecutionStore = ReturnType<typeof createUseCaseExecutionStore>;

@Module({
    imports: [DocumentsTypeormModule],
    providers: [
        ...documentsOperationHandlerProviders,
        documentsOperationHandlerBindingsProvider,
        {
            provide: OperationHandlerResolver,
            inject: [DOCUMENTS_OPERATION_HANDLER_BINDINGS],
            useFactory: (bindings: readonly OperationHandlerBinding[]) =>
                new MapOperationHandlerResolver(bindings),
        },
        {
            provide: SystemClock,
            useFactory: () => new SystemClock(),
        },
        {
            provide: EXECUTION_LEASE_OWNER_ID,
            useFactory: (): ExecutionLeaseOwnerId => randomUUID() as ExecutionLeaseOwnerId,
        },
        {
            provide: DOCUMENTS_RUNNER,
            inject: [
                SystemClock,
                EXECUTION_LEASE_OWNER_ID,
                OperationHandlerResolver,
                TypeOrmExecutionTransaction,
                EXECUTION_LOG_STORE,
                OUTBOX_STORE,
            ],
            useFactory: (
                clock: SystemClock,
                leaseOwnerId: ExecutionLeaseOwnerId,
                operationHandlerResolver: OperationHandlerResolver,
                executionTransaction: TypeOrmExecutionTransaction,
                executionLogStore: ExecutionLogStore,
                outboxStore: OutboxStore,
            ) =>
                createServiceRunner({
                    clock,
                    leaseOwnerId,
                    operationHandlerResolver,
                    executionTransaction,
                    executionLogStore,
                    outboxStore,
                }),
        },
        {
            provide: DOCUMENTS_USE_CASE_EXECUTOR,
            inject: [SystemClock, EXECUTION_LEASE_OWNER_ID, USE_CASE_EXECUTION_STORE],
            useFactory: (
                clock: SystemClock,
                leaseOwnerId: ExecutionLeaseOwnerId,
                store: UseCaseExecutionStore,
            ) =>
                createServiceUseCaseExecutor({
                    clock,
                    leaseOwnerId,
                    store,
                }),
        },
    ],
    exports: [
        OperationHandlerResolver,
        SystemClock,
        EXECUTION_LEASE_OWNER_ID,
        DOCUMENTS_RUNNER,
        DOCUMENTS_USE_CASE_EXECUTOR,
    ],
})
export class DocumentsExecutionModule {}
