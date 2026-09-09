import type {
    DocumentId,
    DocumentProcessingId,
    TenantId,
} from '@accounterbro/core';
import { DataSource } from 'typeorm';

import { createDocumentProcessingPersistence } from '../../../typeorm.js';
import { DocumentProcessing } from '../../document-processing/document-processing.aggregate.js';
import { DocumentProcessingStatus } from '../../document-processing/document-processing-status.js';
import { DocumentProcessingEntity } from './document-processing.entity.js';
import { CreateDocumentProcessing1788912000000 } from './migrations/1788912000000-CreateDocumentProcessing.js';

const createDocumentProcessingMigration = new CreateDocumentProcessing1788912000000();
const tenantA = 'tenant-a' as TenantId;
const tenantB = 'tenant-b' as TenantId;

function processingId(index: number): DocumentProcessingId {
    return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as DocumentProcessingId;
}

function documentId(index: number): DocumentId {
    return `10000000-0000-4000-8000-${String(index).padStart(12, '0')}` as DocumentId;
}

function createDataSource(): DataSource {
    return new DataSource({
        type: 'postgres',
        host: process.env['DB_HOST'] ?? '127.0.0.1',
        port: Number(process.env['DB_PORT'] ?? '5432'),
        username: process.env['DB_USERNAME'] ?? 'postgres',
        password: process.env['DB_PASSWORD'] ?? 'postgres',
        database: process.env['DB_NAME'] ?? 'accounterbro',
        entities: [DocumentProcessingEntity],
        synchronize: false,
    });
}

describe('TypeOrmDocumentProcessingPersistence', () => {
    let dataSource: DataSource;

    beforeEach(async () => {
        dataSource = await createDataSource().initialize();
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.query('DROP TABLE IF EXISTS "document_processing"');
        await createDocumentProcessingMigration.up(queryRunner);
        await queryRunner.release();
    });

    afterEach(async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.query('DROP TABLE IF EXISTS "document_processing"');
        await queryRunner.release();
        await dataSource.destroy();
    });

    it('installs tenant ownership and tenant-local source document uniqueness', async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        const table = await queryRunner.getTable('document_processing');
        await queryRunner.release();

        expect(table?.findColumnByName('tenant_id')?.isNullable).toBe(false);
        expect(table?.findColumnByName('document_id')?.isNullable).toBe(false);
        expect(table?.findColumnByName('extracted_text')?.type).toBe('text');
        expect(
            table?.uniques.map((unique) => ({
                name: unique.name,
                columns: [...unique.columnNames].sort(),
            })),
        ).toEqual([
            {
                name: 'uq_document_processing_tenant_document',
                columns: ['document_id', 'tenant_id'],
            },
        ]);
    });

    it('creates exactly one processing aggregate for concurrent attempts in one tenant', async () => {
        const persistence = createDocumentProcessingPersistence(dataSource);
        const sourceDocumentId = documentId(1);
        const candidates = Array.from({ length: 10 }, (_, index) =>
            DocumentProcessing.pending(processingId(index + 1), tenantA, sourceDocumentId),
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
            throw new Error('Expected one winning DocumentProcessing creation.');
        }

        expect(existing.every((result) => result.processing.id === winner.processing.id)).toBe(
            true,
        );
        expect(existing.every((result) => result.processing.tenantId === tenantA)).toBe(true);
        expect(
            await dataSource.getRepository(DocumentProcessingEntity).countBy({
                tenantId: tenantA,
                documentId: sourceDocumentId,
            }),
        ).toBe(1);
    });

    it('allows the same source DocumentId to be processed independently by different tenants', async () => {
        const persistence = createDocumentProcessingPersistence(dataSource);
        const sourceDocumentId = documentId(2);
        const processingA = DocumentProcessing.pending(processingId(101), tenantA, sourceDocumentId);
        const processingB = DocumentProcessing.pending(processingId(102), tenantB, sourceDocumentId);

        const [resultA, resultB] = await Promise.all([
            persistence.createOrGetExisting(tenantA, processingA),
            persistence.createOrGetExisting(tenantB, processingB),
        ]);

        expect(resultA).toEqual({ kind: 'created', processing: processingA });
        expect(resultB).toEqual({ kind: 'created', processing: processingB });
        expect(
            await dataSource.getRepository(DocumentProcessingEntity).countBy({
                documentId: sourceDocumentId,
            }),
        ).toBe(2);
    });

    it('round-trips pending, completed and failed states through their normal persistence paths', async () => {
        const persistence = createDocumentProcessingPersistence(dataSource);

        const pending = DocumentProcessing.pending(processingId(201), tenantA, documentId(201));
        await persistence.createOrGetExisting(tenantA, pending);
        await expect(persistence.findById(tenantA, pending.id)).resolves.toEqual(pending);
        await expect(persistence.findByDocumentId(tenantA, pending.documentId)).resolves.toEqual(
            pending,
        );

        const completed = DocumentProcessing.pending(
            processingId(202),
            tenantA,
            documentId(202),
        );
        await persistence.createOrGetExisting(tenantA, completed);
        completed.complete('extracted document text');
        await persistence.update(tenantA, completed);
        await expect(persistence.findById(tenantA, completed.id)).resolves.toEqual(completed);
        await expect(
            persistence.findByDocumentId(tenantA, completed.documentId),
        ).resolves.toEqual(completed);

        const failed = DocumentProcessing.pending(processingId(203), tenantA, documentId(203));
        await persistence.createOrGetExisting(tenantA, failed);
        failed.fail('extractor unavailable');
        await persistence.update(tenantA, failed);
        await expect(persistence.findById(tenantA, failed.id)).resolves.toEqual(failed);
        await expect(persistence.findByDocumentId(tenantA, failed.documentId)).resolves.toEqual(
            failed,
        );
    });

    it('returns absence for cross-tenant lookups by processing and source document identity', async () => {
        const persistence = createDocumentProcessingPersistence(dataSource);
        const processing = DocumentProcessing.pending(processingId(301), tenantA, documentId(301));
        await persistence.createOrGetExisting(tenantA, processing);

        await expect(persistence.findById(tenantB, processing.id)).resolves.toBeNull();
        await expect(
            persistence.findByDocumentId(tenantB, processing.documentId),
        ).resolves.toBeNull();
    });

    it('rejects persisted state that violates aggregate restore invariants', async () => {
        const processing = DocumentProcessing.pending(processingId(401), tenantA, documentId(401));
        await dataSource.getRepository(DocumentProcessingEntity).insert({
            id: processing.id,
            tenantId: processing.tenantId,
            documentId: processing.documentId,
            status: DocumentProcessingStatus.Completed,
            extractedText: null,
            failureReason: null,
        });

        const persistence = createDocumentProcessingPersistence(dataSource);
        await expect(persistence.findById(tenantA, processing.id)).rejects.toThrow(
            'COMPLETED DocumentProcessing must contain only extracted text.',
        );
    });

    it('rejects a write whose aggregate owner contradicts the requested tenant scope', async () => {
        const persistence = createDocumentProcessingPersistence(dataSource);
        const processing = DocumentProcessing.pending(processingId(450), tenantB, documentId(450));

        await expect(persistence.createOrGetExisting(tenantA, processing)).rejects.toThrow(
            'Document processing tenant does not match the requested persistence scope.',
        );
    });

    it('does not mutate processing owned by another tenant even when its id is known', async () => {
        const persistence = createDocumentProcessingPersistence(dataSource);
        const id = processingId(501);
        const sourceDocumentId = documentId(501);
        const original = DocumentProcessing.pending(id, tenantB, sourceDocumentId);
        await persistence.createOrGetExisting(tenantB, original);

        const forgedTenantAProcessing = DocumentProcessing.restore({
            id,
            tenantId: tenantA,
            documentId: sourceDocumentId,
            status: DocumentProcessingStatus.Completed,
            extractedText: 'forged text',
        });

        await expect(persistence.update(tenantA, forgedTenantAProcessing)).rejects.toThrow(
            'Document processing does not exist in the requested tenant scope.',
        );

        const unchanged = await persistence.findById(tenantB, id);
        expect(unchanged).not.toBeNull();
        if (!unchanged) {
            throw new Error('Expected tenant B processing aggregate to remain available.');
        }
        expect(unchanged.status).toBe(DocumentProcessingStatus.Pending);
        expect(unchanged.extractedText).toBeUndefined();
        expect(unchanged.failureReason).toBeUndefined();
    });
});
