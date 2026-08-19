import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { DatabaseHealthProbe } from '../../../../../domain/system/health-check/database-health-probe';
import { DatabaseHealthCheckPort } from '../../../../ports/database-health-check.port';

@Injectable()
export class CheckDatabaseHealthUseCase {
    constructor(private readonly databaseHealthCheckPort: DatabaseHealthCheckPort) {}

    async execute(): Promise<void> {
        const id = randomUUID();
        const probe = new DatabaseHealthProbe(id, `database-health-check:${id}`);

        await this.databaseHealthCheckPort.save(probe);

        try {
            const persistedProbe = await this.databaseHealthCheckPort.findById(probe.id);

            if (!persistedProbe || persistedProbe.marker !== probe.marker) {
                throw new Error('Database health probe validation failed');
            }
        } finally {
            await this.databaseHealthCheckPort.delete(probe.id);
        }
    }
}
