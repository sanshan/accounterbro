import type { AnyOutboxRecord } from '@event-driven-platform/outbox';
import type { OutboxStore } from '@event-driven-platform/outbox-store';
import type { DataSource, Repository } from 'typeorm';

import { OutboxEntity } from './outbox.entity.js';

export class TypeOrmOutboxStore implements OutboxStore {
    private readonly repository: Repository<OutboxEntity>;

    public constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(OutboxEntity);
    }

    public async append(records: readonly AnyOutboxRecord[]): Promise<void> {
        if (records.length === 0) {
            return;
        }

        const entities = records.map((record) =>
            this.repository.create({
                id: record.id,
                eventName: record.envelope.eventName,
                schemaVersion: record.envelope.schemaVersion,
                occurredAt: new Date(record.envelope.occurredAt),
                intentId: record.envelope.intentId,
                correlationId: record.envelope.correlationId,
                operationName: record.envelope.operationName,
                tenantType: record.envelope.tenant.type,
                tenantId: record.envelope.tenant.id,
                aggregateType: record.envelope.aggregate.type,
                aggregateId: record.envelope.aggregate.id,
                actorType: record.envelope.actor.type,
                actorId: record.envelope.actor.id,
                envelope: record.envelope,
                createdAt: new Date(record.createdAt),
            }),
        );

        await this.repository.insert(entities);
    }
}
