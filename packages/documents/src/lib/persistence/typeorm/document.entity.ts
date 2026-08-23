import type { DocumentId } from '@accounterbro/core';
import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

import type { DocumentRegistrationStatus } from '../../document/document-registration-status.js';

@Entity('documents')
@Unique('uq_documents_content_hash', ['contentHash'])
export class DocumentEntity {
    @PrimaryColumn({ type: 'uuid' })
    public id!: DocumentId;

    @Column({ name: 'content_hash', type: 'varchar', nullable: false })
    public contentHash!: string;

    @Column({ type: 'varchar', nullable: false })
    public status!: DocumentRegistrationStatus;

    @Column({ name: 'storage_reference', type: 'varchar', nullable: true })
    public storageReference!: string | null;

    @Column({ name: 'failure_reason', type: 'varchar', nullable: true })
    public failureReason!: string | null;
}
