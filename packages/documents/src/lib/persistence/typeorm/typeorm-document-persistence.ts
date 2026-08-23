import type { Repository } from 'typeorm';

import type { CreateDocumentResult, DocumentPersistence } from '../../document-persistence.js';
import type { Document } from '../../document.js';
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

        const insertedRows = insertResult.raw as unknown;
        if (Array.isArray(insertedRows) && insertedRows.length > 0) {
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

    public async findById(id: string): Promise<Document | null> {
        const entity = await this.repository.findOneBy({ id });
        return entity ? DocumentMapper.toDomain(entity) : null;
    }

    public async update(document: Document): Promise<void> {
        await this.repository.save(DocumentMapper.toPersistence(document));
    }
}
