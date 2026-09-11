import { Module } from '@nestjs/common';

import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { GetDocumentProcessingUseCase } from './use-cases/get-document-processing/get-document-processing.use-case';
import { ProcessDocumentUseCase } from './use-cases/process-document/process-document.use-case';

@Module({
    imports: [InfrastructureModule],
    providers: [GetDocumentProcessingUseCase, ProcessDocumentUseCase],
    exports: [InfrastructureModule, GetDocumentProcessingUseCase, ProcessDocumentUseCase],
})
export class ApplicationModule {}
