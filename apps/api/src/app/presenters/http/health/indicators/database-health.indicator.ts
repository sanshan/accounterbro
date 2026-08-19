import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { CheckDatabaseHealthUseCase } from '../../../../application/use-cases/system/health-check/check-database-health/check-database-health.use-case';

@Injectable()
export class DatabaseHealthIndicator {
    constructor(
        private readonly checkDatabaseHealthUseCase: CheckDatabaseHealthUseCase,
        private readonly healthIndicatorService: HealthIndicatorService,
    ) {}

    async check() {
        const indicator = this.healthIndicatorService.check('database');

        try {
            await this.checkDatabaseHealthUseCase.execute();

            return indicator.up();
        } catch {
            return indicator.down();
        }
    }
}
