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
