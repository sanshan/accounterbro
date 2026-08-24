import {
    documentsReadHandlerBindingsProvider,
    documentsReadHandlerProviders,
} from '@accounterbro/documents/execution';
import type { Provider } from '@nestjs/common';

export const documentsReadProviders = [
    ...documentsReadHandlerProviders,
    documentsReadHandlerBindingsProvider,
] satisfies Provider[];
