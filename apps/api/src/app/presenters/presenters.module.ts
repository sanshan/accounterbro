import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ApplicationModule } from '../application/application.module';
import { DatabaseHealthIndicator } from './http/health/indicators/database-health.indicator';
import { HealthController } from './http/health/health.controller';

@Module({
    imports: [
        ApplicationModule,
        TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 1_000,
        }),
    ],
    controllers: [HealthController],
    providers: [DatabaseHealthIndicator],
})
export class PresentersModule {}
