import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1787432000000 implements MigrationInterface {
    public name = 'CreateDocuments1787432000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" uuid NOT NULL,
                "content_hash" character varying NOT NULL,
                "status" character varying NOT NULL,
                "storage_reference" character varying,
                "failure_reason" character varying,
                CONSTRAINT "pk_documents" PRIMARY KEY ("id"),
                CONSTRAINT "uq_documents_content_hash" UNIQUE ("content_hash")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "documents"');
    }
}
