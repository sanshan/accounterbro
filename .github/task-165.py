import json
from pathlib import Path

root = Path('packages/runtime-executions')
src = root / 'src'

(src / 'lib/nest').mkdir(parents=True, exist_ok=True)

(src / 'lib/nest/runtime-process.ts').write_text("""import { randomUUID } from 'node:crypto';

import type { ExecutionLeaseOwnerId } from '@event-driven-platform/execution';

export class RuntimeProcess {
    public readonly leaseOwnerId = randomUUID() as ExecutionLeaseOwnerId;
}
""")

(src / 'lib/nest/runtime-executions.module.ts').write_text("""import { SystemClock } from '@event-driven-platform/clock';
import { Module, type DynamicModule, type FactoryProvider, type Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { createExecutionLogStore, EXECUTION_LOG_TYPEORM_ENTITIES } from '../../execution-log/typeorm.js';
import { createOutboxStore, OUTBOX_TYPEORM_ENTITIES } from '../../outbox/typeorm.js';
import { createServiceReader } from '../../reader.js';
import { createServiceRunner } from '../../runner.js';
import {
    createTransactionAwareDataSource,
    TypeOrmExecutionTransaction,
    TypeOrmTransactionContext,
} from '../../typeorm.js';
import {
    createUseCaseExecutionStore,
    USE_CASE_EXECUTION_TYPEORM_ENTITIES,
} from '../../use-case-execution/typeorm.js';
import { createServiceUseCaseExecutor } from '../../use-case-executor.js';
import { ExecutionLogStore } from '../execution-log/execution-log-store.js';
import {
    MapOperationHandlerResolver,
} from '../operation-handler-resolver/map-operation-handler-resolver.js';
import type { OperationHandlerBinding } from '../operation-handler-resolver/operation-handler-binding.js';
import { OperationHandlerResolver } from '../operation-handler-resolver/operation-handler-resolver.js';
import { OutboxStore } from '../outbox/outbox-store.js';
import {
    MapReadHandlerResolver,
} from '../read-handler-resolver/map-read-handler-resolver.js';
import type { ReadHandlerBinding } from '../read-handler-resolver/read-handler-binding.js';
import { ReadHandlerResolver } from '../read-handler-resolver/read-handler-resolver.js';
import { Reader } from '../reader/reader.js';
import type {
    RuntimeFactoryProvider,
    RuntimePackageManifest,
    RuntimeTypeOrmPersistenceContribution,
} from '../runtime-package/runtime-package.js';
import { collectRuntimePackageTypeOrmSchema } from '../runtime-package/runtime-package.js';
import { Runner } from '../runner/runner.js';
import { UseCaseExecutionStore } from '../use-case-execution/use-case-execution-store.js';
import { UseCaseExecutor } from '../use-case-executor/use-case-executor.js';
import { RuntimeProcess } from './runtime-process.js';

function toNestFactoryProvider(provider: RuntimeFactoryProvider): FactoryProvider {
    return {
        provide: provider.provide as FactoryProvider['provide'],
        inject: [...provider.inject] as FactoryProvider['inject'],
        useFactory: provider.useFactory as FactoryProvider['useFactory'],
    };
}

function createPersistenceProvider(
    contribution: RuntimeTypeOrmPersistenceContribution,
): FactoryProvider {
    return {
        provide: contribution.provide as FactoryProvider['provide'],
        inject: [DataSource, TypeOrmTransactionContext],
        useFactory: (dataSource: DataSource, context: TypeOrmTransactionContext) =>
            contribution.create(createTransactionAwareDataSource(dataSource, context)),
    };
}

@Module({})
export class RuntimeExecutionsModule {
    public static register(packages: readonly RuntimePackageManifest[]): DynamicModule {
        const executionProviders = packages.flatMap((runtimePackage) =>
            (runtimePackage.execution?.providers ?? []).map(toNestFactoryProvider),
        );
        const persistenceProviders = packages.flatMap((runtimePackage) =>
            (runtimePackage.typeorm?.persistence ?? []).map(createPersistenceProvider),
        );
        const operationBindingContainers = packages.flatMap(
            (runtimePackage) => runtimePackage.execution?.operationBindingContainers ?? [],
        );
        const readBindingContainers = packages.flatMap(
            (runtimePackage) => runtimePackage.execution?.readBindingContainers ?? [],
        );
        const schema = collectRuntimePackageTypeOrmSchema(packages);

        const providers: Provider[] = [
            ...executionProviders,
            ...persistenceProviders,
            TypeOrmTransactionContext,
            {
                provide: TypeOrmExecutionTransaction,
                inject: [DataSource, TypeOrmTransactionContext],
                useFactory: (dataSource: DataSource, context: TypeOrmTransactionContext) =>
                    new TypeOrmExecutionTransaction(dataSource, context),
            },
            {
                provide: ExecutionLogStore,
                inject: [DataSource, TypeOrmTransactionContext],
                useFactory: (dataSource: DataSource, context: TypeOrmTransactionContext) =>
                    createExecutionLogStore(createTransactionAwareDataSource(dataSource, context)),
            },
            {
                provide: OutboxStore,
                inject: [DataSource, TypeOrmTransactionContext],
                useFactory: (dataSource: DataSource, context: TypeOrmTransactionContext) =>
                    createOutboxStore(createTransactionAwareDataSource(dataSource, context)),
            },
            {
                provide: UseCaseExecutionStore,
                inject: [DataSource],
                useFactory: createUseCaseExecutionStore,
            },
            {
                provide: OperationHandlerResolver,
                inject: [...operationBindingContainers] as FactoryProvider['inject'],
                useFactory: (...containers: readonly OperationHandlerBinding[][]) =>
                    new MapOperationHandlerResolver(containers.flat()),
            },
            {
                provide: ReadHandlerResolver,
                inject: [...readBindingContainers] as FactoryProvider['inject'],
                useFactory: (...containers: readonly ReadHandlerBinding[][]) =>
                    new MapReadHandlerResolver(containers.flat()),
            },
            SystemClock,
            RuntimeProcess,
            {
                provide: Runner,
                inject: [
                    SystemClock,
                    RuntimeProcess,
                    OperationHandlerResolver,
                    TypeOrmExecutionTransaction,
                    ExecutionLogStore,
                    OutboxStore,
                ],
                useFactory: (
                    clock: SystemClock,
                    process: RuntimeProcess,
                    operationHandlerResolver: OperationHandlerResolver,
                    executionTransaction: TypeOrmExecutionTransaction,
                    executionLogStore: ExecutionLogStore,
                    outboxStore: OutboxStore,
                ) =>
                    createServiceRunner({
                        clock,
                        leaseOwnerId: process.leaseOwnerId,
                        operationHandlerResolver,
                        executionTransaction,
                        executionLogStore,
                        outboxStore,
                    }),
            },
            {
                provide: Reader,
                inject: [ReadHandlerResolver],
                useFactory: (readHandlerResolver: ReadHandlerResolver) =>
                    createServiceReader({ readHandlerResolver }),
            },
            {
                provide: UseCaseExecutor,
                inject: [SystemClock, RuntimeProcess, UseCaseExecutionStore],
                useFactory: (
                    clock: SystemClock,
                    process: RuntimeProcess,
                    store: UseCaseExecutionStore,
                ) =>
                    createServiceUseCaseExecutor({
                        clock,
                        leaseOwnerId: process.leaseOwnerId,
                        store,
                    }),
            },
        ];

        return {
            module: RuntimeExecutionsModule,
            imports: [
                TypeOrmModule.forFeature([
                    ...schema.entities,
                    ...EXECUTION_LOG_TYPEORM_ENTITIES,
                    ...OUTBOX_TYPEORM_ENTITIES,
                    ...USE_CASE_EXECUTION_TYPEORM_ENTITIES,
                ]),
            ],
            providers,
            exports: [Runner, Reader, UseCaseExecutor],
        };
    }
}
""")

(src / 'nest.ts').write_text("""export { RuntimeExecutionsModule } from './lib/nest/runtime-executions.module.js';
""")

(src / 'lib/nest/runtime-executions.module.integration.spec.ts').write_text("""import 'reflect-metadata';

import { defineRuntimePackage, OperationHandlerResolver, ReadHandlerResolver } from '../..//index.js';
import { Reader } from '../reader/reader.js';
import { Runner } from '../runner/runner.js';
import { UseCaseExecutor } from '../use-case-executor/use-case-executor.js';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { RuntimeExecutionsModule } from './runtime-executions.module.js';

const OPERATION_BINDINGS = Symbol('TEST_OPERATION_BINDINGS');
const READ_BINDINGS = Symbol('TEST_READ_BINDINGS');

@Entity({ name: 'runtime_executions_test_entity' })
class TestEntity {
    @PrimaryGeneratedColumn()
    public id!: number;
}

abstract class TestPersistence {
    public abstract readonly dataSource: DataSource;
}

class TestPersistenceAdapter extends TestPersistence {
    public constructor(public readonly dataSource: DataSource) {
        super();
    }
}

const runtimePackage = defineRuntimePackage({
    execution: {
        providers: [
            {
                provide: OPERATION_BINDINGS,
                inject: [],
                useFactory: () => [],
            },
            {
                provide: READ_BINDINGS,
                inject: [],
                useFactory: () => [],
            },
        ],
        operationBindingContainers: [OPERATION_BINDINGS],
        readBindingContainers: [READ_BINDINGS],
    },
    typeorm: {
        entities: [TestEntity],
        persistence: [
            {
                provide: TestPersistence,
                create: (dataSource: DataSource) => new TestPersistenceAdapter(dataSource),
            },
        ],
    },
});

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env['DB_HOST'] ?? '127.0.0.1',
            port: Number(process.env['DB_PORT'] ?? '5432'),
            username: process.env['DB_USERNAME'] ?? 'postgres',
            password: process.env['DB_PASSWORD'] ?? 'postgres',
            database: process.env['DB_NAME'] ?? 'accounterbro',
            autoLoadEntities: true,
            synchronize: false,
        }),
        RuntimeExecutionsModule.register([runtimePackage]),
    ],
})
class TestHostModule {}

describe('RuntimeExecutionsModule', () => {
    it('composes the standard runtime graph from package manifests', async () => {
        const moduleRef = await Test.createTestingModule({ imports: [TestHostModule] }).compile();
        await moduleRef.init();

        const realDataSource = moduleRef.get(DataSource);
        const persistence = moduleRef.get(TestPersistence);

        expect(moduleRef.get(Runner)).toBeDefined();
        expect(moduleRef.get(Reader)).toBeDefined();
        expect(moduleRef.get(UseCaseExecutor)).toBeDefined();
        expect(moduleRef.get(OperationHandlerResolver)).toBeDefined();
        expect(moduleRef.get(ReadHandlerResolver)).toBeDefined();
        expect(persistence.dataSource).not.toBe(realDataSource);
        expect(realDataSource.isInitialized).toBe(true);

        await moduleRef.close();
        expect(realDataSource.isInitialized).toBe(false);
    });
});
""")

package_json_path = root / 'package.json'
package_json = json.loads(package_json_path.read_text())
package_json['exports']['./nest'] = {
    'types': './dist/nest.d.ts',
    'import': './dist/nest.js',
    'default': './dist/nest.js',
}
package_json['dependencies']['@nestjs/common'] = '^11.0.0'
package_json['dependencies']['@nestjs/typeorm'] = '^11.0.3'
package_json.setdefault('devDependencies', {})['@nestjs/core'] = '^11.0.0'
package_json['devDependencies']['@nestjs/testing'] = '^11.0.0'
package_json_path.write_text(json.dumps(package_json, indent=4) + '\n')
