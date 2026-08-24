import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentsConfigModule } from '../../config/documents-config.module';
import { documentsConfig } from '../../config/documents.config';
import { createDocumentsTypeOrmOptions } from './typeorm-options';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [DocumentsConfigModule],
            inject: [documentsConfig.KEY],
            useFactory: (config: ConfigType<typeof documentsConfig>) => ({
                ...createDocumentsTypeOrmOptions(config.database),
                autoLoadEntities: true,
            }),
        }),
    ],
    exports: [TypeOrmModule],
})
export class DocumentsTypeormModule {}
