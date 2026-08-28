import { createTypeOrmDatabaseReadinessCheck } from '@accounterbro/runtime-health/typeorm';
import { HttpHealthModule } from '@accounterbro/runtime-presenters/http/health';
import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ApplicationModule } from '../application/application.module';

@Module({
    imports: [
        HttpHealthModule.register({
            imports: [ApplicationModule],
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
