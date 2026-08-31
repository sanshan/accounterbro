import { documents } from '@accounterbro/documents/runtime';
import { RuntimeExecutionsModule } from '@accounterbro/runtime-executions/nest';
import { Module } from '@nestjs/common';

import { DocumentsConfigModule } from './config/documents-config.module';
import { DocumentsTypeormModule } from './persistence/typeorm/documents-typeorm.module';
import { DocumentsObjectStorageModule } from './storage/documents-object-storage.module';

const documentsRuntimeModule = RuntimeExecutionsModule.register([documents]);

@Module({
    imports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        documentsRuntimeModule,
        DocumentsObjectStorageModule,
    ],
    exports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        documentsRuntimeModule,
        DocumentsObjectStorageModule,
    ],
})
export class InfrastructureModule {}
