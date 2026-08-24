import { Module } from '@nestjs/common';

import { DocumentsConfigModule } from './config/documents-config.module';
import { DocumentsExecutionModule } from './execution/documents-execution.module';
import { DocumentsTypeormModule } from './persistence/typeorm/documents-typeorm.module';
import { DocumentsReadModule } from './read/documents-read.module';

@Module({
    imports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        DocumentsExecutionModule,
        DocumentsReadModule,
    ],
    exports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        DocumentsExecutionModule,
        DocumentsReadModule,
    ],
})
export class InfrastructureModule {}
