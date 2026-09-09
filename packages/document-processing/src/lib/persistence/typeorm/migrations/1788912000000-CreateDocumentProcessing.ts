import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableUnique } from 'typeorm';

export class CreateDocumentProcessing1788912000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'document_processing',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false },
                    { name: 'tenant_id', type: 'varchar', isNullable: false },
                    { name: 'document_id', type: 'uuid', isNullable: false },
                    { name: 'status', type: 'varchar', isNullable: false },
                    { name: 'extracted_text', type: 'text', isNullable: true },
                    { name: 'failure_reason', type: 'varchar', isNullable: true },
                ],
            }),
        );
        await queryRunner.createUniqueConstraint(
            'document_processing',
            new TableUnique({
                name: 'uq_document_processing_tenant_document',
                columnNames: ['tenant_id', 'document_id'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('document_processing');
    }
}
