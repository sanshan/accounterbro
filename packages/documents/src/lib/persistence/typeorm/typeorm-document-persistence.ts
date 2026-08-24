import type { DocumentId } from '@accounterbro/core';
import type { Repository } from 'typeorm';

import type { Document } from '../../document/document.aggregate.js';
import type { CreateDocumentResult, DocumentPersistence } from '../../ports/document-persistence.js';
import { DocumentEntity } from './document.entity.js';
import { DocumentMapper } from './document.mapper.js';

export class TypeOrmDocumentPersistence implements DocumentPersistence {
    public constructor(private readonly repository: Repository<DocumentEntity>) {}

    public async createOrGetExisting(document: Document): Promise<CreateDocumentResult> {
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

        const existing = await this.repository.findOneBy({ contentHash: document.contentHash });
        if (!existing) {
            throw new Error('Document uniqueness conflict did not resolve to an existing document.');
        }

        return {
            kind: 'existing',
            document: DocumentMapper.toDomain(existing),
        };
    }

    public async findById(id: DocumentId): Promise<Document | null> {
        const entity = await this.repository.findOneBy({ id });
        return entity ? DocumentMapper.toDomain(entity) : null;
    }

    public async update(document: Document): Promise<void> {
        await this.repository.save(DocumentMapper.toPersistence(document));
    }
}
