import type { ReadHandlerResolver } from '../read-handler-resolver/read-handler-resolver.js';

export interface CreateServiceReaderOptions {
    readonly readHandlerResolver: ReadHandlerResolver;
}
