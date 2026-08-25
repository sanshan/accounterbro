import { ObjectStorage } from '@accounterbro/object-storage';
import type { Reader } from '@event-driven-platform/reader';
import type { Runner } from '@event-driven-platform/runner';
import { Module } from '@nestjs/common';

import { GetDocumentUseCase } from '../application/use-cases/get-document.use-case';
import { RegisterDocumentUseCase } from '../application/use-cases/register-document.use-case';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { DOCUMENTS_READER, DOCUMENTS_RUNNER } from '../infrastructure/runtime/runtime.tokens';
import { DocumentsController } from './http/documents/documents.controller';

@Module({
    imports: [InfrastructureModule],
    controllers: [DocumentsController],
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
})
export class PresentersModule {}
