import {
    DocumentPersistence,
    createDocumentPersistence,
} from '@accounterbro/documents/typeorm';
import type { Provider } from '@nestjs/common';

import { TRANSACTION_AWARE_DATA_SOURCE } from '../../../../runtime/runtime.tokens';

export const documentsTypeOrmProviders = [
    {
        provide: DocumentPersistence,
        inject: [TRANSACTION_AWARE_DATA_SOURCE],
        useFactory: createDocumentPersistence,
    },
] satisfies Provider[];
