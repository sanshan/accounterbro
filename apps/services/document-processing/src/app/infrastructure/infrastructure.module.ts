import { documentProcessing } from '@accounterbro/document-processing/runtime';
import { RuntimeExecutionsModule } from '@accounterbro/runtime-executions/nest';
import { Module } from '@nestjs/common';

import { DocumentProcessingConfigModule } from './config/document-processing-config.module';
import { DocumentProcessingExtractionModule } from './extraction/document-processing-extraction.module';
import { DocumentProcessingTypeormModule } from './persistence/typeorm/document-processing-typeorm.module';
import { DocumentProcessingObjectStorageModule } from './storage/document-processing-object-storage.module';

const documentProcessingRuntimeModule = RuntimeExecutionsModule.register([documentProcessing]);

@Module({
    imports: [
        DocumentProcessingConfigModule,
        DocumentProcessingTypeormModule,
        documentProcessingRuntimeModule,
        DocumentProcessingObjectStorageModule,
        DocumentProcessingExtractionModule,
    ],
    exports: [
        DocumentProcessingConfigModule,
        DocumentProcessingTypeormModule,
        documentProcessingRuntimeModule,
        DocumentProcessingObjectStorageModule,
        DocumentProcessingExtractionModule,
    ],
})
export class InfrastructureModule {}
