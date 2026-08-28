import { ObjectStorage } from '@accounterbro/object-storage';
import type { Reader } from '@event-driven-platform/reader';
import type { Runner } from '@event-driven-platform/runner';
import { Module } from '@nestjs/common';

import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { DOCUMENTS_READER, DOCUMENTS_RUNNER } from '../infrastructure/runtime/runtime.tokens';
import { GetDocumentUseCase } from './use-cases/get-document.use-case';
import { RegisterDocumentUseCase } from './use-cases/register-document.use-case';

@Module({
    imports: [InfrastructureModule],
    providers: [
        {
            provide: RegisterDocumentUseCase,
            inject: [DOCUMENTS_RUNNER, ObjectStorage],
            useFactory: (runner: Runner, objectStorage: ObjectStorage) =>
                new RegisterDocumentUseCase(runner, objectStorage),
        },
        {
            provide: GetDocumentUseCase,
            inject: [DOCUMENTS_READER],
            useFactory: (reader: Reader) => new GetDocumentUseCase(reader),
        },
    ],
    exports: [InfrastructureModule, RegisterDocumentUseCase, GetDocumentUseCase],
})
export class ApplicationModule {}
