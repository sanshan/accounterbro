import { DataSource } from 'typeorm';

import type { Document } from '../../document.js';
import { DocumentEntity } from './document.entity.js';
import { CreateDocuments1787440000000 } from './migrations/1787440000000-CreateDocuments.js';
import { TypeOrmDocumentPersistence } from './typeorm-document-persistence.js';

const migration = new CreateDocuments1787440000000();

function createDataSource(): DataSource {
    return new DataSource({
        type: 'postgres',
        host: process.env['DB_HOST'] ?? '127.0.0.1',
        port: Number(process.env['DB_PORT'] ?? '5432'),
        username: process.env['DB_USERNAME'] ?? 'postgres',
        password: process.env['DB_PASSWORD'] ?? 'postgres',
        database: process.env['DB_NAME'] ?? 'accounterbro',
        entities: [DocumentEntity],
        synchronize: false,
    });
}

describe('TypeOrmDocumentPersistence', () => {
    let dataSource: DataSource;

    beforeEach(async () => {
        dataSource = await createDataSource().initialize();
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.query('DROP TABLE IF EXISTS "documents"');
        await migration.up(queryRunner);
        await queryRunner.release();
    });

    afterEach(async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await migration.down(queryRunner);
        await queryRunner.release();
        await dataSource.destroy();
    });

    it('creates exactly one document and returns that winner to concurrent duplicates', async () => {
        const persistence = new TypeOrmDocumentPersistence(dataSource.getRepository(DocumentEntity));
        const contentHash = 'same-content-hash';
        const candidates: Document[] = Array.from({ length: 10 }, (_, index) => ({
            id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
            contentHash,
            status: 'PENDING',
        }));

        const results = await Promise.all(
            candidates.map((candidate) => persistence.createOrGetExisting(candidate)),
        );

        const created = results.filter((result) => result.kind === 'created');
        const existing = results.filter((result) => result.kind === 'existing');

        expect(created).toHaveLength(1);
        expect(existing).toHaveLength(9);

        const winner = created[0];
        expect(winner).toBeDefined();
        if (!winner) {
            throw new Error('Expected one winning document creation.');
        }

        expect(existing.every((result) => result.document.id === winner.document.id)).toBe(true);
        expect(existing.every((result) => result.document.status === winner.document.status)).toBe(true);
        expect(await dataSource.getRepository(DocumentEntity).countBy({ contentHash })).toBe(1);
    });
});
