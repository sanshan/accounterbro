import { DatabaseHealthProbe } from '../../../../domain/system/health-check/database-health-probe';
import type { DatabaseHealthProbeEntity } from '../entities/database-health-probe.entity';

export class DatabaseHealthProbeMapper {
    static toDomain(entity: DatabaseHealthProbeEntity): DatabaseHealthProbe {
        return new DatabaseHealthProbe(entity.id, entity.marker);
    }

    static toPersistence(probe: DatabaseHealthProbe): DatabaseHealthProbeEntity {
        return {
            id: probe.id,
            marker: probe.marker,
        };
    }
}
