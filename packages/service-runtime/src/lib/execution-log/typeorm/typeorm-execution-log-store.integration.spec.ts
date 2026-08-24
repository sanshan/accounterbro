import {
    DefaultExecutionIdFactory,
    type ExecutionLeaseOwnerId,
} from '@event-driven-platform/execution';
import { ExecutionTransactionOutcomes } from '@event-driven-platform/execution-transaction';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';
import { DataSource } from 'typeorm';

import {
    EXECUTION_LOG_TYPEORM_ENTITIES,
    EXECUTION_LOG_TYPEORM_MIGRATIONS,
    createExecutionLogStore,
} from '../../../execution-log/typeorm.js';
import {
    createTransactionAwareDataSource,
    TypeOrmExecutionTransaction,
    TypeOrmTransactionContext,
} from '../../../typeorm.js';

const [ExecutionLogEntity, ExecutionAttemptEntity] = EXECUTION_LOG_TYPEORM_ENTITIES;
const [ExecutionLogMigration] = EXECUTION_LOG_TYPEORM_MIGRATIONS;

const runnerA = 'runner-a' as ExecutionLeaseOwnerId;
const runnerB = 'runner-b' as ExecutionLeaseOwnerId;

const operationResult: OperationResultOf<AnyOperation> = {
    status: 'success',
    data: { documentId: 'document-1' },
    events: [],
};

function createOperation(intentId = 'intent-1'): AnyOperation {
    return {
        name: 'documents.prepare-registration',
        schemaVersion: 1,
        intent: {
            id: intentId,
            key: `documents:prepare-registration:v1:${intentId}`,
        },
        actor: {
            type: 'user',
            id: 'user-1',
            origin: {},
        },
        tenant: {
            type: 'business',
            id: 'tenant-1' as AnyOperation['tenant']['id'],
        },
        subject: {
            type: 'user',
            id: 'user-1',
        },
        aggregate: {
            type: 'document',
            id: '00000000-0000-4000-8000-000000000001' as AnyOperation['aggregate']['id'],
        },
        payload: {
            contentHash: 'content-hash-1',
        },
    };
}

function createDataSource(): DataSource {
    return new DataSource({
        type: 'postgres',
        host: process.env['DB_HOST'] ?? '127.0.0.1',
        port: Number(process.env['DB_PORT'] ?? '5432'),
        username: process.env['DB_USERNAME'] ?? 'postgres',
        password: process.env['DB_PASSWORD'] ?? 'postgres',
        database: process.env['DB_NAME'] ?? 'accounterbro',
        entities: [...EXECUTION_LOG_TYPEORM_ENTITIES],
        synchronize: false,
    });
}

describe('TypeOrmExecutionLogStore', () => {
    let dataSource: DataSource;

    beforeEach(async () => {
        dataSource = await createDataSource().initialize();
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.query('DROP TABLE IF EXISTS "execution_attempt"');
        await queryRunner.query('DROP TABLE IF EXISTS "execution_log"');
        await new ExecutionLogMigration().up(queryRunner);
        await queryRunner.release();
    });

    afterEach(async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await new ExecutionLogMigration().down(queryRunner);
        await queryRunner.release();
        await dataSource.destroy();
    });

    it('serializes same-Intent claims, advances reclaim fencing, and rejects the stale owner', async () => {
        const store = createExecutionLogStore(dataSource);
        const operation = createOperation();
        const executionId = new DefaultExecutionIdFactory().create(operation.intent.id);
        const firstRequest = {
            executionId,
            operation,
            correlationId: 'correlation-1',
            leaseOwnerId: runnerA,
            leaseDurationMs: 30_000,
            requestedAt: '2026-08-24T06:00:00.000Z',
        };

        const claims = await Promise.all(
            Array.from({ length: 6 }, () => store.claim(firstRequest)),
        );

        expect(claims.filter((claim) => claim.type === 'claimed')).toHaveLength(1);
        expect(claims.filter((claim) => claim.type === 'already-in-progress')).toHaveLength(5);

        const firstClaim = claims.find((claim) => claim.type === 'claimed');
        if (!firstClaim || firstClaim.type !== 'claimed') {
            throw new Error('Expected one winning execution claim.');
        }

        expect(firstClaim.entry.attemptCount).toBe(1);
        expect(firstClaim.entry.latestAttempt.attemptNumber).toBe(1);
        expect(firstClaim.entry.lease.version).toBe(1);

        const reclaimed = await store.claim({
            ...firstRequest,
            correlationId: 'correlation-2',
            leaseOwnerId: runnerB,
            requestedAt: '2026-08-24T06:00:31.000Z',
        });

        expect(reclaimed.type).toBe('claimed');
        if (reclaimed.type !== 'claimed') {
            throw new Error('Expected expired execution lease to be reclaimed.');
        }

        expect(reclaimed.entry.attemptCount).toBe(2);
        expect(reclaimed.entry.latestAttempt.attemptNumber).toBe(2);
        expect(reclaimed.entry.lease.version).toBe(2);
        expect(reclaimed.entry.lease.ownerId).toBe(runnerB);

        const staleCompletion = await store.complete<AnyOperation>({
            executionId,
            attemptId: firstClaim.entry.latestAttempt.attemptId,
            lease: {
                ownerId: firstClaim.entry.lease.ownerId,
                version: firstClaim.entry.lease.version,
            },
            result: operationResult,
            finishedAt: '2026-08-24T06:00:32.000Z',
        });

        expect(staleCompletion.type).toBe('lease-conflict');

        const attempts = await dataSource.getRepository(ExecutionAttemptEntity).find({
            where: { executionId },
            order: { attemptNumber: 'ASC' },
        });
        expect(attempts).toHaveLength(2);
        expect(attempts.map((attempt) => attempt.status)).toEqual([
            'timed-out',
            'in-progress',
        ]);
        expect(attempts.map((attempt) => attempt.leaseVersion)).toEqual([1, 2]);

        const execution = await dataSource.getRepository(ExecutionLogEntity).findOneByOrFail({
            executionId,
        });
        expect(execution.status).toBe('in-progress');
        expect(execution.attemptCount).toBe(2);
        expect(execution.result).toBeNull();
    });

    it('joins terminal persistence to the shared execution transaction', async () => {
        const operation = createOperation('intent-transaction');
        const executionId = new DefaultExecutionIdFactory().create(operation.intent.id);
        const transactionContext = new TypeOrmTransactionContext();
        const transactionAwareDataSource = createTransactionAwareDataSource(
            dataSource,
            transactionContext,
        );
        const store = createExecutionLogStore(transactionAwareDataSource);
        const transaction = new TypeOrmExecutionTransaction(dataSource, transactionContext);
        const claim = await store.claim({
            executionId,
            operation,
            correlationId: 'correlation-transaction',
            leaseOwnerId: runnerA,
            leaseDurationMs: 30_000,
            requestedAt: '2026-08-24T07:00:00.000Z',
        });

        if (claim.type !== 'claimed') {
            throw new Error('Expected execution to be claimed.');
        }

        await transaction.execute(async () => {
            const completion = await store.complete<AnyOperation>({
                executionId,
                attemptId: claim.entry.latestAttempt.attemptId,
                lease: {
                    ownerId: claim.entry.lease.ownerId,
                    version: claim.entry.lease.version,
                },
                result: operationResult,
                finishedAt: '2026-08-24T07:00:01.000Z',
            });

            expect(completion.type).toBe('completed');

            return ExecutionTransactionOutcomes.rollback(undefined);
        });

        const persisted = await store.findByIntentId(operation.intent.id);
        expect(persisted?.latestAttempt.status).toBe('in-progress');
        expect(persisted?.result).toBeNull();

        const attempt = await dataSource.getRepository(ExecutionAttemptEntity).findOneByOrFail({
            executionId,
        });
        expect(attempt.status).toBe('in-progress');
        expect(attempt.finishedAt).toBeNull();

        const execution = await dataSource.getRepository(ExecutionLogEntity).findOneByOrFail({
            executionId,
        });
        expect(execution.status).toBe('in-progress');
        expect(execution.finishedAt).toBeNull();
    });
});
