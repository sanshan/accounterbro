import { documentProcessing } from '@accounterbro/document-processing/runtime';
import { RuntimeExecutionsModule } from '@accounterbro/runtime-executions/nest';
import { Module } from '@nestjs/common';

import { DocumentProcessingConfigModule } from './config/document-processing-config.module';
import { DocumentProcessingTypeormModule } from './persistence/typeorm/document-processing-typeorm.module';

const documentProcessingRuntimeModule = RuntimeExecutionsModule.register([documentProcessing]);

@Module({
    imports: [
        DocumentProcessingConfigModule,
        DocumentProcessingTypeormModule,
        documentProcessingRuntimeModule,
    ],
    exports: [
        DocumentProcessingConfigModule,
        DocumentProcessingTypeormModule,
        documentProcessingRuntimeModule,
    ],
})
export class InfrastructureModule {}
