import { Module } from '@nestjs/common';

import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { GetDocumentUseCase } from './use-cases/get-document.use-case';
import { RegisterDocumentUseCase } from './use-cases/register-document.use-case';

@Module({
    imports: [InfrastructureModule],
    providers: [RegisterDocumentUseCase, GetDocumentUseCase],
    exports: [InfrastructureModule, RegisterDocumentUseCase, GetDocumentUseCase],
})
export class ApplicationModule {}
