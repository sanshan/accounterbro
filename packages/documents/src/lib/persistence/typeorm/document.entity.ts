import type { DocumentId, TenantId } from '@accounterbro/core';
import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

import type { DocumentRegistrationStatus } from '../../document/document-registration-status.js';

@Entity('documents')
@Unique('uq_documents_tenant_content_hash', ['tenantId', 'contentHash'])
export class DocumentEntity {
    @PrimaryColumn({ type: 'uuid' })
    public id!: DocumentId;

    @Column({ name: 'tenant_id', type: 'varchar', nullable: false })
    public tenantId!: TenantId;

    @Column({ name: 'content_hash', type: 'varchar', nullable: false })
    public contentHash!: string;

    @Column({ type: 'varchar', nullable: false })
    public status!: DocumentRegistrationStatus;

    @Column({ name: 'storage_reference', type: 'varchar', nullable: true })
    public storageReference!: string | null;

    @Column({ name: 'failure_reason', type: 'varchar', nullable: true })
    public failureReason!: string | null;
}
