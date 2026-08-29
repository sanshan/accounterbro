import { DOCUMENTS_READ_HANDLER_BINDINGS } from '@accounterbro/documents/execution';
import {
    MapReadHandlerResolver,
    ReadHandlerResolver,
    type ReadHandlerBinding,
} from '@accounterbro/runtime-executions';
import { createServiceReader } from '@accounterbro/runtime-executions/reader';
import { Module } from '@nestjs/common';

import { DocumentsTypeormModule } from '../persistence/typeorm/documents-typeorm.module';
import { DOCUMENTS_READER } from '../runtime/runtime.tokens';
import { documentsReadProviders } from './providers/documents/documents-read-handlers.providers';

@Module({
    imports: [DocumentsTypeormModule],
    providers: [
        ...documentsReadProviders,
        {
            provide: ReadHandlerResolver,
            inject: [DOCUMENTS_READ_HANDLER_BINDINGS],
            useFactory: (bindings: readonly ReadHandlerBinding[]) =>
                new MapReadHandlerResolver(bindings),
        },
        {
            provide: DOCUMENTS_READER,
            inject: [ReadHandlerResolver],
            useFactory: (readHandlerResolver: ReadHandlerResolver) =>
                createServiceReader({ readHandlerResolver }),
        },
    ],
    exports: [ReadHandlerResolver, DOCUMENTS_READER],
})
export class DocumentsReadModule {}
