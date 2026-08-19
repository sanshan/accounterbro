import { Module } from '@nestjs/common';

import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { CheckDatabaseHealthUseCase } from './use-cases/system/health-check/check-database-health/check-database-health.use-case';

@Module({
    imports: [InfrastructureModule],
    providers: [CheckDatabaseHealthUseCase],
    exports: [CheckDatabaseHealthUseCase],
})
export class ApplicationModule {}
