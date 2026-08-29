import { DefaultReader, type Reader } from '@event-driven-platform/reader';

import type { CreateServiceReaderOptions } from './create-service-reader-options.js';

export function createServiceReader(options: CreateServiceReaderOptions): Reader {
    return new DefaultReader({
        readHandlerResolver: options.readHandlerResolver,
    });
}
