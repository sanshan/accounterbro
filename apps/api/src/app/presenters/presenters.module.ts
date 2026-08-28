import { createTypeOrmDatabaseReadinessCheck } from '@accounterbro/runtime-health/typeorm';
import { HttpHealthModule } from '@accounterbro/runtime-presenters/http/health';
import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
    imports: [
        HttpHealthModule.register({
            imports: [InfrastructureModule],
            readinessChecks: {
                inject: [DataSource],
                useFactory: (dataSource: DataSource) => [
                    createTypeOrmDatabaseReadinessCheck(dataSource),
                ],
            },
        }),
    ],
})
export class PresentersModule {}
