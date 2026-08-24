import type { DocumentId } from '@accounterbro/core';
import { DataSource } from 'typeorm';

import { createDocumentPersistence } from '../../../typeorm.js';
import { Document } from '../../document/document.aggregate.js';
import { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import { DocumentEntity } from './document.entity.js';
import { CreateDocuments1787440000000 } from './migrations/1787440000000-CreateDocuments.js';

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

    it('creates exactly one document and returns that winner to concurrent duplicates through the public factory', async () => {
        const persistence = createDocumentPersistence(dataSource);
        const contentHash = 'same-content-hash';
        const candidates = Array.from({ length: 10 }, (_, index) =>
            Document.pending(
                `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as DocumentId,
                contentHash,
            ),
        );

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

        expect(winner.document.status).toBe(DocumentRegistrationStatus.Pending);
        expect(existing.every((result) => result.document.id === winner.document.id)).toBe(true);
        expect(existing.every((result) => result.document.status === winner.document.status)).toBe(true);
        expect(await dataSource.getRepository(DocumentEntity).countBy({ contentHash })).toBe(1);
    });

    it('round-trips aggregate state through find and update', async () => {
        const persistence = createDocumentPersistence(dataSource);
        const documentId = '00000000-0000-4000-8000-000000000100' as DocumentId;

        await persistence.createOrGetExisting(Document.pending(documentId, 'round-trip-hash'));

        const pending = await persistence.findById(documentId);
        expect(pending).not.toBeNull();
        if (!pending) {
            throw new Error('Expected persisted Document to be found.');
        }

        expect(pending.id).toBe(documentId);
        expect(pending.contentHash).toBe('round-trip-hash');
        expect(pending.status).toBe(DocumentRegistrationStatus.Pending);
        expect(pending.storageReference).toBeUndefined();
        expect(pending.failureReason).toBeUndefined();

        pending.register('storage://document-round-trip');
        await persistence.update(pending);

        const registered = await persistence.findById(documentId);
        expect(registered).not.toBeNull();
        if (!registered) {
            throw new Error('Expected updated Document to be found.');
        }

        expect(registered.id).toBe(documentId);
        expect(registered.contentHash).toBe('round-trip-hash');
        expect(registered.status).toBe(DocumentRegistrationStatus.Registered);
        expect(registered.storageReference).toBe('storage://document-round-trip');
        expect(registered.failureReason).toBeUndefined();
    });
});
