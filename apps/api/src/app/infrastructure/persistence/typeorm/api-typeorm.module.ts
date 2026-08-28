import { RUNTIME_HEALTH_TYPEORM_ENTITIES } from '@accounterbro/runtime-health/typeorm';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiConfigModule } from '../../config/api-config.module';
import { apiConfig } from '../../config/api.config';
import { createApiTypeOrmOptions } from './typeorm-options';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ApiConfigModule],
            inject: [apiConfig.KEY],
            useFactory: (config: ConfigType<typeof apiConfig>) => ({
                ...createApiTypeOrmOptions(config.database),
                autoLoadEntities: true,
            }),
        }),
        TypeOrmModule.forFeature([...RUNTIME_HEALTH_TYPEORM_ENTITIES]),
    ],
    exports: [TypeOrmModule],
})
export class ApiTypeormModule {}
