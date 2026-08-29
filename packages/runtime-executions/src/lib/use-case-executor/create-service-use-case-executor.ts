import { DefaultExecutionIdFactory } from '@event-driven-platform/execution';
import {
    createUseCaseExecutor,
    type UseCaseExecutor,
} from '@event-driven-platform/use-case-executor';

import type { CreateServiceUseCaseExecutorOptions } from './create-service-use-case-executor-options.js';

export function createServiceUseCaseExecutor(
    options: CreateServiceUseCaseExecutorOptions,
): UseCaseExecutor {
    return createUseCaseExecutor({
        dependencies: {
            clock: options.clock,
            executionIdFactory: new DefaultExecutionIdFactory(),
            store: options.store,
        },
        runtime: {
            leaseOwnerId: options.leaseOwnerId,
        },
    });
}
