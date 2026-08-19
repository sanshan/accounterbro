import { randomUUID } from 'node:crypto';
import type { QueryRunner, Repository } from 'typeorm';

import { DatabaseHealthProbe } from '../../../../domain/system/health-check/database-health-probe';
import { AppDataSource } from '../data-source';
import { DatabaseHealthProbeEntity } from '../entities/database-health-probe.entity';
import { TypeOrmDatabaseHealthCheckRepository } from './typeorm-database-health-check.repository';

describe('TypeOrmDatabaseHealthCheckRepository', () => {
    let queryRunner: QueryRunner;
    let entityRepository: Repository<DatabaseHealthProbeEntity>;
    let repository: TypeOrmDatabaseHealthCheckRepository;

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        queryRunner = AppDataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        entityRepository = queryRunner.manager.getRepository(DatabaseHealthProbeEntity);
        repository = new TypeOrmDatabaseHealthCheckRepository(entityRepository);
    });

    afterAll(async () => {
        if (queryRunner?.isTransactionActive) {
            await queryRunner.rollbackTransaction();
        }

        await queryRunner?.release();

        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });

    it('persists and maps a database health probe', async () => {
        const id = randomUUID();
        const probe = new DatabaseHealthProbe(id, `database-health-check:${id}`);

        await repository.save(probe);

        const result = await repository.findById(id);

        expect(result).toEqual(probe);
    });

    it('returns null when the database health probe does not exist', async () => {
        const result = await repository.findById(randomUUID());

        expect(result).toBeNull();
    });

    it('deletes a database health probe', async () => {
        const id = randomUUID();
        const probe = new DatabaseHealthProbe(id, `database-health-check:${id}`);

        await repository.save(probe);
        await repository.delete(id);

        await expect(repository.findById(id)).resolves.toBeNull();
    });
});
