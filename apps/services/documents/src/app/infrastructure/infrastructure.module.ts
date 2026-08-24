import { Module } from '@nestjs/common';

import { DocumentsConfigModule } from './config/documents-config.module';
import { DocumentsTypeormModule } from './persistence/typeorm/documents-typeorm.module';

@Module({
    imports: [DocumentsConfigModule, DocumentsTypeormModule],
    exports: [DocumentsConfigModule, DocumentsTypeormModule],
})
export class InfrastructureModule {}
