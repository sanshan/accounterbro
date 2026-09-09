import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentProcessingConfigModule } from '../../config/document-processing-config.module';
import { documentProcessingConfig } from '../../config/document-processing.config';
import { createDocumentProcessingTypeOrmOptions } from './typeorm-options';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [DocumentProcessingConfigModule],
            inject: [documentProcessingConfig.KEY],
            useFactory: (config: ConfigType<typeof documentProcessingConfig>) => ({
                ...createDocumentProcessingTypeOrmOptions(config.database),
                autoLoadEntities: true,
            }),
        }),
    ],
    exports: [TypeOrmModule],
})
export class DocumentProcessingTypeormModule {}
