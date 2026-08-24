import {
    documentsOperationHandlerBindingsProvider,
    documentsOperationHandlerProviders,
} from '@accounterbro/documents/execution';
import type { Provider } from '@nestjs/common';

export const documentsOperationProviders = [
    ...documentsOperationHandlerProviders,
    documentsOperationHandlerBindingsProvider,
] satisfies Provider[];
