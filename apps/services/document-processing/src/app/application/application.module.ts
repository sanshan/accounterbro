import { Module } from '@nestjs/common';

import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { GetDocumentProcessingUseCase } from './use-cases/get-document-processing/get-document-processing.use-case';

@Module({
    imports: [InfrastructureModule],
    providers: [GetDocumentProcessingUseCase],
    exports: [InfrastructureModule, GetDocumentProcessingUseCase],
})
export class ApplicationModule {}
