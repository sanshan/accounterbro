import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseHealthCheckPort } from '../../../application/ports/database-health-check.port';
import { ApiConfigModule } from '../../config/api-config.module';
import { apiConfig } from '../../config/api.config';
import { DatabaseHealthProbeEntity } from './entities/database-health-probe.entity';
import { TypeOrmDatabaseHealthCheckRepository } from './repositories/typeorm-database-health-check.repository';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ApiConfigModule],
            inject: [apiConfig.KEY],
            useFactory: (config: ConfigType<typeof apiConfig>) => {
                const { name, host, port, username, password } = config.database;

                return {
                    type: 'postgres' as const,
                    host,
                    port,
                    username,
                    password,
                    database: name,
                    synchronize: false,
                    logging: false,
                    autoLoadEntities: true,
                };
            },
        }),
        TypeOrmModule.forFeature([DatabaseHealthProbeEntity]),
    ],
    providers: [
        {
            provide: DatabaseHealthCheckPort,
            useClass: TypeOrmDatabaseHealthCheckRepository,
        },
    ],
    exports: [TypeOrmModule, DatabaseHealthCheckPort],
})
export class ApiTypeormModule {}
