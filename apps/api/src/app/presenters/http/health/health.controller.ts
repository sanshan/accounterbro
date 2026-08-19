import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { DatabaseHealthIndicator } from './indicators/database-health.indicator';

@Controller('health')
export class HealthController {
    constructor(
        private readonly healthCheckService: HealthCheckService,
        private readonly databaseHealthIndicator: DatabaseHealthIndicator,
    ) {}

    @Get('live')
    @HealthCheck()
    live() {
        return this.healthCheckService.check([]);
    }

    @Get('ready')
    @HealthCheck()
    ready() {
        return this.healthCheckService.check([() => this.databaseHealthIndicator.check()]);
    }
}
