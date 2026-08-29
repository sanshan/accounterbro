import type { DocumentId, TenantId } from '@accounterbro/core';
import type { Repository } from 'typeorm';

import type { Document } from '../../document/document.aggregate.js';
import type { CreateDocumentResult, DocumentPersistence } from '../../ports/document-persistence.js';
import { DocumentEntity } from './document.entity.js';
import { DocumentMapper } from './document.mapper.js';

export class TypeOrmDocumentPersistence implements DocumentPersistence {
    public constructor(private readonly repository: Repository<DocumentEntity>) {}

    public async createOrGetExisting(
        tenantId: TenantId,
        document: Document,
    ): Promise<CreateDocumentResult> {
        this.assertTenantScope(tenantId, document);

        const insertResult = await this.repository
            .createQueryBuilder()
            .insert()
            .into(DocumentEntity)
            .values(DocumentMapper.toPersistence(document))
            .orIgnore()
            .returning('id')
            .execute();

        if (Array.isArray(insertResult.raw) && insertResult.raw.length > 0) {
            return { kind: 'created', document };
        }

        const existing = await this.repository.findOneBy({
            tenantId,
            contentHash: document.contentHash,
        });
        if (!existing) {
            throw new Error('Document uniqueness conflict did not resolve to an existing document.');
        }

        return {
            kind: 'existing',
            document: DocumentMapper.toDomain(existing),
        };
    }

    public async findById(tenantId: TenantId, id: DocumentId): Promise<Document | null> {
        const entity = await this.repository.findOneBy({ tenantId, id });
        return entity ? DocumentMapper.toDomain(entity) : null;
    }

    public async update(tenantId: TenantId, document: Document): Promise<void> {
        this.assertTenantScope(tenantId, document);

        const entity = DocumentMapper.toPersistence(document);
        const result = await this.repository.update(
            { tenantId, id: document.id },
            {
                contentHash: entity.contentHash,
                status: entity.status,
                storageReference: entity.storageReference,
                failureReason: entity.failureReason,
            },
        );

        if (result.affected !== 1) {
            throw new Error('Document does not exist in the requested tenant scope.');
        }
    }

    private assertTenantScope(tenantId: TenantId, document: Document): void {
        if (document.tenantId !== tenantId) {
            throw new Error('Document tenant does not match the requested persistence scope.');
        }
    }
}
