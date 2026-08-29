import type { Clock } from '@event-driven-platform/clock';
import type { ExecutionLeaseOwnerId } from '@event-driven-platform/execution';
import type { ExecutionLogStore } from '@event-driven-platform/execution-log-store';
import type { ExecutionTransaction } from '@event-driven-platform/execution-transaction';
import type { OutboxStore } from '@event-driven-platform/outbox-store';

import type { OperationHandlerResolver } from '../operation-handler-resolver/operation-handler-resolver.js';

export interface CreateServiceRunnerOptions {
    readonly clock: Clock;
    readonly leaseOwnerId: ExecutionLeaseOwnerId;
    readonly operationHandlerResolver: OperationHandlerResolver;
    readonly executionTransaction: ExecutionTransaction;
    readonly executionLogStore: ExecutionLogStore;
    readonly outboxStore: OutboxStore;
}
