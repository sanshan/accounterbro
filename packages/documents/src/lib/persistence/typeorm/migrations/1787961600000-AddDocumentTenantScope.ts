import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn, TableUnique } from 'typeorm';

export class AddDocumentTenantScope1787961600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // No trustworthy tenant can be derived for legacy rows. PostgreSQL intentionally rejects
        // this required column when unowned rows exist instead of assigning fabricated ownership.
        await queryRunner.addColumn(
            'documents',
            new TableColumn({
                name: 'tenant_id',
                type: 'varchar',
                isNullable: false,
            }),
        );
        await queryRunner.dropUniqueConstraint('documents', 'uq_documents_content_hash');
        await queryRunner.createUniqueConstraint(
            'documents',
            new TableUnique({
                name: 'uq_documents_tenant_content_hash',
                columnNames: ['tenant_id', 'content_hash'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreating the old constraint first makes rollback fail safely when tenant-local
        // duplicates can no longer be represented by the former global uniqueness model.
        await queryRunner.createUniqueConstraint(
            'documents',
            new TableUnique({
                name: 'uq_documents_content_hash',
                columnNames: ['content_hash'],
            }),
        );
        await queryRunner.dropUniqueConstraint(
            'documents',
            'uq_documents_tenant_content_hash',
        );
        await queryRunner.dropColumn('documents', 'tenant_id');
    }
}
