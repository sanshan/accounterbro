# Service Runtime Agent Rules

These rules apply to `packages/service-runtime/` in addition to the root workspace rules.

## Purpose

`@accounterbro/service-runtime` owns reusable AccounterBro service-composition infrastructure around published `@event-driven-platform/*` primitives.

EDP remains the source of truth for execution contracts and semantics. MUST NOT copy, fork, wrap, or reimplement EDP behavior unless AccounterBro has a concrete repository-specific composition responsibility that EDP does not own.

Keep runtime composition framework-agnostic unless a concrete task explicitly requires a framework boundary. Shared runtime code MUST NOT become Documents-specific or another business-domain implementation.

## Verification

Tests in this package MUST cover behavior implemented by AccounterBro itself: composition, adapters, mappings, invariants, and failure cases introduced here.

MUST NOT duplicate tests for behavior already owned and tested by EDP merely because `service-runtime` consumes an EDP contract. Prefer typecheck/build evidence for structural contract compatibility and add runtime tests only for AccounterBro-owned behavior.

## Operation handler resolution

The canonical Operation resolver boundary is:

- `OperationHandlerBinding` is shared runtime composition data and does not belong in `@accounterbro/core`;
- `OperationHandlerResolver` is the runtime-valued AccounterBro DI identity implementing the EDP resolver contract;
- `MapOperationHandlerResolver` owns only AccounterBro's operation-name-to-handler lookup, including duplicate-binding and missing-binding rejection;
- business packages own their Operation-name-to-handler binding groups and expose them from their Nest-agnostic `/execution` entrypoint;
- each service composes one `OperationHandlerResolver` from the binding groups of the business packages it hosts;
- do not introduce service-specific resolver tokens such as `SERVICE_OPERATION_HANDLER_RESOLVER`.

## TypeORM execution transactions

The canonical shared TypeORM execution boundary is exported from `@accounterbro/service-runtime/typeorm`.

- the hosting service owns the real Nest-managed `DataSource` lifecycle and connection configuration;
- one shared `TypeOrmTransactionContext` carries the current transaction `EntityManager` through `AsyncLocalStorage.run(...)` for the current async execution chain;
- `createTransactionAwareDataSource(...)` is the adapter passed to package TypeORM factories and shared runtime stores that need ambient participation in the current execution transaction;
- repositories obtained from that adapter select the real service repository outside an execution transaction and the current transaction-manager repository while the context is active;
- `TypeOrmExecutionTransaction` implements the published EDP `ExecutionTransaction` contract through a real service-owned `QueryRunner` and exposes that runner's manager through the same context while EDP work executes;
- this package MUST NOT initialize, destroy, or otherwise replace ownership of the service `DataSource`, and MUST NOT reproduce EDP transaction semantics beyond the TypeORM integration required by the published contract.

## TypeORM execution log persistence

The canonical shared EDP `ExecutionLogStore` adapter is exported from `@accounterbro/service-runtime/execution-log/typeorm`.

- `service-runtime` owns the reusable `execution_log` and `execution_attempt` TypeORM entities/migration and exposes their composition contracts from that subpath;
- every transactional business service composes those artifacts into its own service-owned database; execution data is not centralized across services;
- the store receives the transaction-aware `DataSource` from the shared TypeORM execution boundary so `complete()` / `fail()` participate in the same Runner transaction as business persistence and Outbox writes without knowing about `AsyncLocalStorage` or `QueryRunner`;
- claim/reclaim and terminal transitions MUST preserve atomic same-Intent ownership, deterministic EDP attempt identities, persisted attempt history, and lease-generation fencing;
- lease expiry alone MUST NOT make `complete()` / `fail()` stale; a reclaim advances the lease generation and that generation change fences the previous owner;
- tests MUST stay focused on the AccounterBro TypeORM adapter guarantees such as database concurrency, fencing, and ambient transaction participation. Do not repeat EDP contract-shape or Runner behavior tests.

## TypeORM Outbox persistence

The canonical shared EDP `OutboxStore` adapter is exported from `@accounterbro/service-runtime/outbox/typeorm`.

- `service-runtime` owns the reusable append-only `outbox` TypeORM entity/migration and exposes their composition contracts from that subpath;
- every transactional business service composes those artifacts into its own service-owned database; Outbox data is not centralized across services;
- the store receives the same transaction-aware `DataSource` used by business persistence and execution-log terminal writes so `append()` participates in the active execution transaction without knowing about `AsyncLocalStorage` or `QueryRunner`;
- the authoritative persisted event representation is the complete EDP Event envelope; searchable/CDC columns are projections of that envelope and MUST NOT replace or redefine EDP event semantics;
- publication is CDC-owned. MUST NOT add Outbox delivery lifecycle state such as status, published timestamps, retry counters, locks/leases, or an application polling publisher;
- tests MUST stay focused on AccounterBro-owned projection and ambient transaction participation. Do not repeat EDP Outbox record/factory contract tests.

## Runner composition

The canonical shared Runner composition is exported from `@accounterbro/service-runtime/runner`.

- `createServiceRunner(...)` MUST delegate Runner construction to the published EDP `createRunner()` API; this package MUST NOT implement, subclass, or wrap Runner behavior;
- shared composition owns only the AccounterBro baseline dependency graph: EDP `DefaultExecutionIdFactory`, `DefaultEventIdFactory`, `DefaultOperationEventEnvelopeFactory`, `DefaultOutboxRecordFactory`, the shared resolver and execution-persistence ports, process lease owner, and Runner options;
- one caller-supplied EDP `Clock` instance MUST be reused by Runner and the EDP event/outbox factories; production services use one `SystemClock`, while deterministic tests may supply `FixedClock`;
- the process-level `ExecutionLeaseOwnerId` is supplied by the hosting service and identifies one running process/replica, not a stable logical service name;
- the baseline Runner lease duration is `30_000` ms and MUST NOT become per-service configuration without a concrete reviewed requirement;
- optional EDP Runner policies such as guards, rate limiting, custom retry delay, or custom execution timeout are not part of the baseline composition and MUST NOT be added speculatively;
- tests MUST verify only these AccounterBro composition choices and MUST NOT repeat EDP Runner, factory, transition, retry, timeout, guard, or rate-limit behavior tests.
