import type {
    DocumentId,
    DocumentProcessingId,
    TenantId,
} from '@accounterbro/core';
import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

import type { DocumentProcessingStatus } from '../../document-processing/document-processing-status.js';

@Entity('document_processing')
@Unique('uq_document_processing_tenant_document', ['tenantId', 'documentId'])
export class DocumentProcessingEntity {
    @PrimaryColumn({ type: 'uuid' })
    public id!: DocumentProcessingId;

    @Column({ name: 'tenant_id', type: 'varchar', nullable: false })
    public tenantId!: TenantId;

    @Column({ name: 'document_id', type: 'uuid', nullable: false })
    public documentId!: DocumentId;

    @Column({ type: 'varchar', nullable: false })
    public status!: DocumentProcessingStatus;

    @Column({ name: 'extracted_text', type: 'text', nullable: true })
    public extractedText!: string | null;

    @Column({ name: 'failure_reason', type: 'varchar', nullable: true })
    public failureReason!: string | null;
}
