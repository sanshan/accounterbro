import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableUnique } from 'typeorm';

export class CreateDocuments1787440000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'documents',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false },
                    { name: 'content_hash', type: 'varchar', isNullable: false },
                    { name: 'status', type: 'varchar', isNullable: false },
                    { name: 'storage_reference', type: 'varchar', isNullable: true },
                    { name: 'failure_reason', type: 'varchar', isNullable: true },
                ],
            }),
        );
        await queryRunner.createUniqueConstraint(
            'documents',
            new TableUnique({
                name: 'uq_documents_content_hash',
                columnNames: ['content_hash'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('documents');
    }
}
