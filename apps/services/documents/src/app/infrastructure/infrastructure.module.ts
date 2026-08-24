import { Module } from '@nestjs/common';

import { DocumentsConfigModule } from './config/documents-config.module';
import { DocumentsExecutionModule } from './execution/documents-execution.module';
import { DocumentsTypeormModule } from './persistence/typeorm/documents-typeorm.module';
import { DocumentsReadModule } from './read/documents-read.module';
import { DocumentsObjectStorageModule } from './storage/documents-object-storage.module';

@Module({
    imports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        DocumentsExecutionModule,
        DocumentsReadModule,
        DocumentsObjectStorageModule,
    ],
    exports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        DocumentsExecutionModule,
        DocumentsReadModule,
        DocumentsObjectStorageModule,
    ],
})
export class InfrastructureModule {}
