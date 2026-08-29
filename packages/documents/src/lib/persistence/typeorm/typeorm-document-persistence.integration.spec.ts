import type { DocumentId, TenantId } from '@accounterbro/core';
import { DataSource } from 'typeorm';

import { createDocumentPersistence } from '../../../typeorm.js';
import { Document } from '../../document/document.aggregate.js';
import { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import { DocumentEntity } from './document.entity.js';
import { CreateDocuments1787440000000 } from './migrations/1787440000000-CreateDocuments.js';
import { AddDocumentTenantScope1787961600000 } from './migrations/1787961600000-AddDocumentTenantScope.js';

const createDocumentsMigration = new CreateDocuments1787440000000();
const addDocumentTenantScopeMigration = new AddDocumentTenantScope1787961600000();
const tenantA = 'tenant-a' as TenantId;
const tenantB = 'tenant-b' as TenantId;

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
        await createDocumentsMigration.up(queryRunner);
        await addDocumentTenantScopeMigration.up(queryRunner);
        await queryRunner.release();
    });

    afterEach(async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.query('DROP TABLE IF EXISTS "documents"');
        await queryRunner.release();
        await dataSource.destroy();
    });

    it('installs required tenant ownership and tenant-local content uniqueness', async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        const table = await queryRunner.getTable('documents');
        await queryRunner.release();

        expect(table?.findColumnByName('tenant_id')?.isNullable).toBe(false);
        expect(
            table?.uniques.map((unique) => ({
                name: unique.name,
                columns: [...unique.columnNames].sort(),
            })),
        ).toEqual([
            {
                name: 'uq_documents_tenant_content_hash',
                columns: ['content_hash', 'tenant_id'],
            },
        ]);
    });

    it('creates exactly one document for concurrent duplicates within one tenant', async () => {
        const persistence = createDocumentPersistence(dataSource);
        const contentHash = 'same-content-hash';
        const candidates = Array.from({ length: 10 }, (_, index) =>
            Document.pending(
                `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as DocumentId,
                tenantA,
                contentHash,
            ),
        );

        const results = await Promise.all(
            candidates.map((candidate) => persistence.createOrGetExisting(tenantA, candidate)),
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

        expect(winner.document.tenantId).toBe(tenantA);
        expect(winner.document.status).toBe(DocumentRegistrationStatus.Pending);
        expect(existing.every((result) => result.document.id === winner.document.id)).toBe(true);
        expect(existing.every((result) => result.document.tenantId === tenantA)).toBe(true);
        expect(existing.every((result) => result.document.status === winner.document.status)).toBe(
            true,
        );
        expect(
            await dataSource.getRepository(DocumentEntity).countBy({
                tenantId: tenantA,
                contentHash,
            }),
        ).toBe(1);
    });

    it('creates distinct documents for identical content owned by different tenants', async () => {
        const persistence = createDocumentPersistence(dataSource);
        const contentHash = 'cross-tenant-content-hash';
        const documentA = Document.pending(
            '00000000-0000-4000-8000-000000000101' as DocumentId,
            tenantA,
            contentHash,
        );
        const documentB = Document.pending(
            '00000000-0000-4000-8000-000000000102' as DocumentId,
            tenantB,
            contentHash,
        );

        const [resultA, resultB] = await Promise.all([
            persistence.createOrGetExisting(tenantA, documentA),
            persistence.createOrGetExisting(tenantB, documentB),
        ]);

        expect(resultA).toEqual({ kind: 'created', document: documentA });
        expect(resultB).toEqual({ kind: 'created', document: documentB });
        expect(
            await dataSource.getRepository(DocumentEntity).countBy({
                contentHash,
            }),
        ).toBe(2);
    });

    it('round-trips aggregate state only through the owning tenant lookup', async () => {
        const persistence = createDocumentPersistence(dataSource);
        const documentId = '00000000-0000-4000-8000-000000000103' as DocumentId;

        await persistence.createOrGetExisting(
            tenantA,
            Document.pending(documentId, tenantA, 'round-trip-hash'),
        );

        await expect(persistence.findById(tenantB, documentId)).resolves.toBeNull();

        const pending = await persistence.findById(tenantA, documentId);
        expect(pending).not.toBeNull();
        if (!pending) {
            throw new Error('Expected persisted Document to be found.');
        }

        expect(pending.id).toBe(documentId);
        expect(pending.tenantId).toBe(tenantA);
        expect(pending.contentHash).toBe('round-trip-hash');
        expect(pending.status).toBe(DocumentRegistrationStatus.Pending);
        expect(pending.storageReference).toBeUndefined();
        expect(pending.failureReason).toBeUndefined();

        pending.register('storage://document-round-trip');
        await persistence.update(tenantA, pending);

        const registered = await persistence.findById(tenantA, documentId);
        expect(registered).not.toBeNull();
        if (!registered) {
            throw new Error('Expected updated Document to be found.');
        }

        expect(registered.id).toBe(documentId);
        expect(registered.tenantId).toBe(tenantA);
        expect(registered.contentHash).toBe('round-trip-hash');
        expect(registered.status).toBe(DocumentRegistrationStatus.Registered);
        expect(registered.storageReference).toBe('storage://document-round-trip');
        expect(registered.failureReason).toBeUndefined();
    });

    it('does not update a document owned by another tenant even when its id is known', async () => {
        const persistence = createDocumentPersistence(dataSource);
        const documentId = '00000000-0000-4000-8000-000000000104' as DocumentId;
        const original = Document.pending(documentId, tenantB, 'tenant-b-hash');

        await persistence.createOrGetExisting(tenantB, original);

        const forgedTenantADocument = Document.restore({
            id: documentId,
            tenantId: tenantA,
            contentHash: 'tenant-a-forged-hash',
            status: DocumentRegistrationStatus.Registered,
            storageReference: 'storage://forged',
        });

        await expect(persistence.update(tenantA, forgedTenantADocument)).rejects.toThrow(
            'Document does not exist in the requested tenant scope.',
        );

        const unchanged = await persistence.findById(tenantB, documentId);
        expect(unchanged).not.toBeNull();
        if (!unchanged) {
            throw new Error('Expected the tenant B Document to remain available.');
        }

        expect(unchanged.tenantId).toBe(tenantB);
        expect(unchanged.contentHash).toBe('tenant-b-hash');
        expect(unchanged.status).toBe(DocumentRegistrationStatus.Pending);
        expect(unchanged.storageReference).toBeUndefined();
    });
});
