import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type { DatabaseHealthCheckPort } from '../../../../application/ports/database-health-check.port';
import type { DatabaseHealthProbe } from '../../../../domain/system/health-check/database-health-probe';
import { DatabaseHealthProbeEntity } from '../entities/database-health-probe.entity';
import { DatabaseHealthProbeMapper } from '../mappers/database-health-probe.mapper';

@Injectable()
export class TypeOrmDatabaseHealthCheckRepository implements DatabaseHealthCheckPort {
    constructor(
        @InjectRepository(DatabaseHealthProbeEntity)
        private readonly repository: Repository<DatabaseHealthProbeEntity>,
    ) {}

    async save(probe: DatabaseHealthProbe): Promise<void> {
        await this.repository.save(DatabaseHealthProbeMapper.toPersistence(probe));
    }

    async findById(id: string): Promise<DatabaseHealthProbe | null> {
        const entity = await this.repository.findOneBy({ id });

        return entity ? DatabaseHealthProbeMapper.toDomain(entity) : null;
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }
}
