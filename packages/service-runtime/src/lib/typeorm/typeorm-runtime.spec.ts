import { ExecutionTransactionOutcomes } from '@event-driven-platform/execution-transaction';
import type {
    DataSource,
    EntityManager,
    QueryRunner,
    Repository,
} from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { createTransactionAwareDataSource } from './transaction-aware-data-source.js';
import { TypeOrmExecutionTransaction } from './typeorm-execution-transaction.js';
import { TypeOrmTransactionContext } from './typeorm-transaction-context.js';

class TestEntity {
    public id = '';
}

function createRepository(id: string): Repository<TestEntity> {
    const repository = {
        findOneBy: vi.fn(async function (this: Repository<TestEntity>) {
            return { id: this === repository ? id : 'unbound' };
        }),
    } as Repository<TestEntity>;

    return repository;
}

function createManager(repository: Repository<TestEntity>): EntityManager {
    return {
        getRepository: vi.fn(() => repository),
    } as EntityManager;
}

function createQueryRunner(manager: EntityManager): QueryRunner {
    let transactionActive = false;

    return {
        manager,
        get isTransactionActive() {
            return transactionActive;
        },
        connect: vi.fn(async () => undefined),
        startTransaction: vi.fn(async () => {
            transactionActive = true;
        }),
        commitTransaction: vi.fn(async () => {
            transactionActive = false;
        }),
        rollbackTransaction: vi.fn(async () => {
            transactionActive = false;
        }),
        release: vi.fn(async () => undefined),
    } as QueryRunner;
}

describe('@accounterbro/service-runtime/typeorm', () => {
    it('selects the transaction-bound repository at use time', async () => {
        const defaultRepository = createRepository('default');
        const transactionRepository = createRepository('transaction');
        const defaultManager = createManager(defaultRepository);
        const transactionManager = createManager(transactionRepository);
        const dataSource = { manager: defaultManager } as DataSource;
        const transactionContext = new TypeOrmTransactionContext();
        const transactionAwareDataSource = createTransactionAwareDataSource(
            dataSource,
            transactionContext,
        );
        const repository = transactionAwareDataSource.getRepository(TestEntity);

        await expect(repository.findOneBy({ id: 'document-1' })).resolves.toEqual({
            id: 'default',
        });

        await transactionContext.run(transactionManager, async () => {
            await expect(repository.findOneBy({ id: 'document-1' })).resolves.toEqual({
                id: 'transaction',
            });
        });
    });

    it('commits through QueryRunner while exposing its manager in the transaction context', async () => {
        const transactionManager = createManager(createRepository('transaction'));
        const queryRunner = createQueryRunner(transactionManager);
        const dataSource = {
            createQueryRunner: vi.fn(() => queryRunner),
        } as DataSource;
        const transactionContext = new TypeOrmTransactionContext();
        const transaction = new TypeOrmExecutionTransaction(dataSource, transactionContext);

        await transaction.execute(async () => {
            expect(transactionContext.getManager()).toBe(transactionManager);

            return ExecutionTransactionOutcomes.commit(undefined);
        });

        expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
        expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalledOnce();
    });

    it('maps an EDP rollback outcome to QueryRunner rollback', async () => {
        const transactionManager = createManager(createRepository('transaction'));
        const queryRunner = createQueryRunner(transactionManager);
        const dataSource = {
            createQueryRunner: vi.fn(() => queryRunner),
        } as DataSource;
        const transaction = new TypeOrmExecutionTransaction(
            dataSource,
            new TypeOrmTransactionContext(),
        );

        await transaction.execute(async () => ExecutionTransactionOutcomes.rollback(undefined));

        expect(queryRunner.rollbackTransaction).toHaveBeenCalledOnce();
        expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalledOnce();
    });
});
