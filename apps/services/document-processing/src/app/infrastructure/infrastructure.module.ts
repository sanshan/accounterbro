import { Module } from '@nestjs/common';

import { DocumentProcessingConfigModule } from './config/document-processing-config.module';
import { DocumentProcessingTypeormModule } from './persistence/typeorm/document-processing-typeorm.module';

@Module({
    imports: [DocumentProcessingConfigModule, DocumentProcessingTypeormModule],
    exports: [DocumentProcessingConfigModule, DocumentProcessingTypeormModule],
})
export class InfrastructureModule {}
