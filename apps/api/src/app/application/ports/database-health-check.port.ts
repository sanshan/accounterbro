import type { DatabaseHealthProbe } from '../../domain/system/health-check/database-health-probe';

export abstract class DatabaseHealthCheckPort {
    abstract save(probe: DatabaseHealthProbe): Promise<void>;
    abstract findById(id: string): Promise<DatabaseHealthProbe | null>;
    abstract delete(id: string): Promise<void>;
}
