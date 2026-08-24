import {
    DOCUMENTS_READ_HANDLER_BINDINGS,
    documentsReadHandlerBindingsProvider,
    documentsReadHandlerProviders,
} from '@accounterbro/documents/execution';
import {
    MapReadHandlerResolver,
    ReadHandlerResolver,
    type ReadHandlerBinding,
} from '@accounterbro/service-runtime';
import { createServiceReader } from '@accounterbro/service-runtime/reader';
import { Module } from '@nestjs/common';

import { DocumentsTypeormModule } from '../persistence/typeorm/documents-typeorm.module';
import { DOCUMENTS_READER } from '../runtime/runtime.tokens';

@Module({
    imports: [DocumentsTypeormModule],
    providers: [
        ...documentsReadHandlerProviders,
        documentsReadHandlerBindingsProvider,
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
