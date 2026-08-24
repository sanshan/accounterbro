import type { Clock } from '@event-driven-platform/clock';
import type { ExecutionLeaseOwnerId } from '@event-driven-platform/execution';
import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';

export interface CreateServiceUseCaseExecutorOptions {
    readonly clock: Clock;
    readonly leaseOwnerId: ExecutionLeaseOwnerId;
    readonly store: UseCaseExecutionStore;
}
