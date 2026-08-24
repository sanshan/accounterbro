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
- one Operation name MUST map to exactly one Operation handler; duplicate Operation bindings are invalid composition;
- business packages own their Operation-name-to-handler binding groups and expose them from their Nest-agnostic `/execution` entrypoint;
- each service composes one `OperationHandlerResolver` from the binding groups of the business packages it hosts;
- do not introduce service-specific resolver tokens such as `SERVICE_OPERATION_HANDLER_RESOLVER`.

## Read handler resolution

The canonical Read resolver boundary mirrors the Operation resolver where the EDP contract permits it:

- `ReadHandlerBinding` is shared runtime composition data and does not belong in `@accounterbro/core`;
- `ReadHandlerResolver` is the runtime-valued AccounterBro DI identity implementing the published EDP resolver contract;
- `MapReadHandlerResolver` owns only exact Read-name lookup and AccounterBro composition validation;
- one Read name MUST map to exactly one Read handler; duplicate Read bindings are invalid composition and are rejected deterministically during resolver construction;
- the EDP Read resolver contract represents `resolved.handlers` as a non-empty tuple, so the AccounterBro single-handler invariant is adapted as a singleton tuple `[handler]`;
- an unbound Read returns the EDP `not-found` outcome; the canonical exact-name resolver does not turn duplicate configuration into EDP `ambiguous`;
- business packages own their Read-name-to-handler binding groups and expose them from their Nest-agnostic `/execution` entrypoint;
- each service composes one `ReadHandlerResolver` from the binding groups of the business packages it hosts;
- do not introduce service-specific Read resolver tokens or local resolver implementations.

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

## TypeORM UseCase execution persistence

The canonical shared EDP `UseCaseExecutionStore` adapter is exported from `@accounterbro/service-runtime/use-case-execution/typeorm`.

- `service-runtime` owns one reusable `use_case_execution` entity/migration and exposes its composition contracts and factory from that subpath;
- every business service that uses durable UseCase execution composes that schema into its own service-owned database; UseCase execution state is not centralized across services;
- the store uses the real service-owned `DataSource` boundary and its own short atomic database transitions. It MUST NOT imply one SQL transaction spanning child Operations/Reads executed by a UseCase;
- one row represents one logical UseCase invocation and preserves its authoritative Intent association, correlation id, current fenced lease generation, completion/release state, and durable completed result;
- `release()` makes the same invocation immediately claimable again and MUST NOT create attempt or failure history;
- lease expiry makes an invocation reclaimable but does not itself fence the current owner. Only a successful new claim that advances `lease_version` fences the previous owner;
- completed results must be JSON-serializable for durable `jsonb` replay. Do not introduce a serializer framework without a concrete non-JSON requirement;
- MUST NOT add attempts, failure history, lease renewal, heartbeat, progress detection, child-step state, Outbox behavior, or service-local copies of the store;
- tests MUST stay focused on AccounterBro-owned PostgreSQL concurrency, fencing, schema-state, release/reclaim, and durable replay guarantees. Do not repeat EDP contract or UseCaseExecutor tests.

## Runner composition

The canonical shared Runner composition is exported from `@accounterbro/service-runtime/runner`.

- `createServiceRunner(...)` MUST delegate Runner construction to the published EDP `createRunner()` API; this package MUST NOT implement, subclass, or wrap Runner behavior;
- shared composition owns only the AccounterBro baseline dependency graph: EDP `DefaultExecutionIdFactory`, `DefaultEventIdFactory`, `DefaultOperationEventEnvelopeFactory`, `DefaultOutboxRecordFactory`, the shared resolver and execution-persistence ports, process lease owner, and Runner options;
- one caller-supplied EDP `Clock` instance MUST be reused by Runner and the EDP event/outbox factories; production services use one `SystemClock`, while deterministic tests may supply `FixedClock`;
- the process-level `ExecutionLeaseOwnerId` is supplied by the hosting service and identifies one running process/replica, not a stable logical service name;
- the baseline Runner lease duration is `30_000` ms and MUST NOT become per-service configuration without a concrete reviewed requirement;
- optional EDP Runner policies such as guards, rate limiting, custom retry delay, or custom execution timeout are not part of the baseline composition and MUST NOT be added speculatively;
- tests MUST verify only these AccounterBro composition choices and MUST NOT repeat EDP Runner, factory, transition, retry, timeout, guard, or rate-limit behavior tests.

## Reader composition

The canonical shared Reader composition is exported from `@accounterbro/service-runtime/reader`.

- `createServiceReader(...)` MUST construct the published EDP `DefaultReader` directly; this package MUST NOT implement, subclass, or wrap Reader behavior;
- the only baseline dependency supplied by shared composition is the service-wide `ReadHandlerResolver`;
- EDP default timeout behavior remains canonical and MUST NOT be overridden without a concrete reviewed requirement;
- cache plans remain Query-owned and are interpreted by EDP Reader; shared service runtime MUST NOT introduce service-wide cache-key, cache-level, traversal, promotion, or backfill policy;
- `ReadExecutionCoordinator` and a custom read-execution owner-id factory are not part of baseline composition and MUST remain opt-in until a concrete Query requires distributed coordination;
- tests MUST verify only the AccounterBro composition choice and MUST NOT repeat EDP Reader dispatch, timeout, cache, inflight, coordination, or error behavior tests.
