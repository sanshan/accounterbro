import type {
    DocumentId,
    DocumentProcessingId,
    TenantId,
} from '@accounterbro/core';
import type { Repository } from 'typeorm';

import type { DocumentProcessing } from '../../document-processing/document-processing.aggregate.js';
import type {
    CreateDocumentProcessingResult,
    DocumentProcessingPersistence,
} from '../../ports/document-processing-persistence.js';
import { DocumentProcessingEntity } from './document-processing.entity.js';
import { DocumentProcessingMapper } from './document-processing.mapper.js';

export class TypeOrmDocumentProcessingPersistence implements DocumentProcessingPersistence {
    public constructor(private readonly repository: Repository<DocumentProcessingEntity>) {}

    public async createOrGetExisting(
        tenantId: TenantId,
        processing: DocumentProcessing,
    ): Promise<CreateDocumentProcessingResult> {
        this.assertTenantScope(tenantId, processing);

        const insertResult = await this.repository
            .createQueryBuilder()
            .insert()
            .into(DocumentProcessingEntity)
            .values(DocumentProcessingMapper.toPersistence(processing))
            .orIgnore()
            .returning('id')
            .execute();

        if (Array.isArray(insertResult.raw) && insertResult.raw.length > 0) {
            return { kind: 'created', processing };
        }

        const existing = await this.repository.findOneBy({
            tenantId,
            documentId: processing.documentId,
        });
        if (!existing) {
            throw new Error(
                'Document processing uniqueness conflict did not resolve to an existing processing aggregate.',
            );
        }

        return {
            kind: 'existing',
            processing: DocumentProcessingMapper.toDomain(existing),
        };
    }

    public async findById(
        tenantId: TenantId,
        processingId: DocumentProcessingId,
    ): Promise<DocumentProcessing | null> {
        const entity = await this.repository.findOneBy({ tenantId, id: processingId });
        return entity ? DocumentProcessingMapper.toDomain(entity) : null;
    }

    public async findByDocumentId(
        tenantId: TenantId,
        documentId: DocumentId,
    ): Promise<DocumentProcessing | null> {
        const entity = await this.repository.findOneBy({ tenantId, documentId });
        return entity ? DocumentProcessingMapper.toDomain(entity) : null;
    }

    public async update(tenantId: TenantId, processing: DocumentProcessing): Promise<void> {
        this.assertTenantScope(tenantId, processing);

        const entity = DocumentProcessingMapper.toPersistence(processing);
        const result = await this.repository.update(
            { tenantId, id: processing.id },
            {
                status: entity.status,
                extractedText: entity.extractedText,
                failureReason: entity.failureReason,
            },
        );

        if (result.affected !== 1) {
            throw new Error('Document processing does not exist in the requested tenant scope.');
        }
    }

    private assertTenantScope(tenantId: TenantId, processing: DocumentProcessing): void {
        if (processing.tenantId !== tenantId) {
            throw new Error(
                'Document processing tenant does not match the requested persistence scope.',
            );
        }
    }
}
