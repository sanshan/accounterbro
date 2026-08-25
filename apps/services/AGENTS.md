# Internal Service Agent Rules

These rules apply to internal services under `apps/services/` in addition to the root workspace rules.

## Creation and identity

New internal services MUST be created with:

```bash
pnpm nx g @accounterbro/generators:service <name>
```

The canonical layout and identity convention is:

```text
apps/services/<name> -> @accounterbro/<name>-service
```

MUST NOT create a new internal service by invoking `@nx/nest:application`, `@nx/node:application`, or another low-level application generator directly. The repository generator owns normalization to the proven non-bundled service shell.

## Configuration

When creating or changing internal service configuration, MUST follow `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md`.

Use `apps/api` as the proven configuration reference. Reuse the documented service-owned env schema, callable namespaced `registerAs` config factory, small `ConfigModule.forFeature` wrapper, and typed `KEY` / `ConfigType` consumption pattern.

MUST NOT introduce a generic shared Nest configuration abstraction, service-local `.env` loading, duplicate raw-variable validation, or direct `process.env` access outside the documented service configuration boundary without a concrete requirement.

## HTTP presenter runtime

Adding a `presenters/http` boundary makes the hosting service an HTTP server process. The service MUST then have a complete runnable HTTP bootstrap rather than remain an application-context-only Nest process.

A service with `presenters/http` MUST:

- create the Nest application with `NestFactory.create(...)`, not only `createApplicationContext(...)`;
- expose its listen port through the canonical typed service configuration boundary;
- use `@accounterbro/runtime-config` for the raw port when the same port is consumed by workspace/E2E tooling, so that the raw environment variable has one validation owner;
- obtain the namespaced service config through its existing `registerAs` `KEY` / `ConfigType` contract in `main.ts`;
- call `app.listen(config.port)` during bootstrap;
- preserve shutdown hooks and other process lifecycle behavior already owned by the service.

Use `apps/api/src/main.ts` and `apps/api/src/app/infrastructure/config/api.config.ts` as the proven HTTP bootstrap/configuration reference. Do not hard-code ports in bootstrap code or validate the same raw port again in the service-local env schema when `@accounterbro/runtime-config` already owns it.

The base internal-service generator remains transport-agnostic. Do not add an HTTP listener to every generated service merely because some services expose HTTP presenters.

## Service E2E projects

Create the E2E project for an internal HTTP service with:

```bash
pnpm nx g @accounterbro/generators:service-e2e <name>
```

The canonical layout and identity are:

```text
apps/services/<name>-e2e -> @accounterbro/<name>-service-e2e
```

The service MUST already satisfy the HTTP presenter runtime contract above before adding its E2E harness. The service-E2E generator owns the reusable Jest/SWC support project, the dependency on the target service, the migration + HTTP-server orchestration, and the `e2e` configuration added to the service's existing `serve` target.

The base service generator remains transport-agnostic and MUST NOT receive an E2E-specific serve configuration preemptively. Add that configuration only when the service E2E project is created.

Use `apps/api-e2e` as the proven network E2E reference. Service E2E tests MAY test service-owned HTTP behavior, but MUST NOT duplicate UseCase, EDP runtime, persistence, or other lower-boundary semantics already covered by their owning tests.

## Database and migrations

When a service owns PostgreSQL persistence, MUST follow `docs/engineering/database-guidelines.md`.

When a service hosts a TypeORM-backed business package, MUST also follow the TypeORM integration rules in `docs/engineering/package-guidelines.md`: the service owns the real Nest/TypeORM `DataSource` lifecycle and connection configuration; the business package owns its business TypeORM entities/migrations and exposes them through `@accounterbro/<package>/typeorm` composition contracts.

Persistence ports used as Nest DI tokens MUST come from the package's `/typeorm` entrypoint as runtime values, and the service MUST bind them to the package-exported factory by injecting the service-owned `DataSource`. Provider files are grouped by package under `infrastructure/persistence/typeorm/providers/<package>/`; the service MUST NOT recreate package adapter construction or deep-import package persistence internals.

Services that execute EDP Operations transactionally MUST use the shared `@accounterbro/service-runtime/typeorm` transaction boundary described in `docs/engineering/database-guidelines.md`: keep the real Nest-managed `DataSource` as lifecycle owner, share one `TypeOrmTransactionContext`, pass the transaction-aware `DataSource` to package persistence factories, and use the shared TypeORM `ExecutionTransaction` adapter. MUST NOT implement service-local `AsyncLocalStorage`, `QueryRunner`, or repository-switching transaction plumbing.

The same services MUST use the shared `@accounterbro/service-runtime/execution-log/typeorm` adapter and compose its exported entities/migrations into that service's own database. Bind the store to the transaction-aware `DataSource`; do not create a Documents-specific execution-log adapter, central execution-log database, or service-local copy of claim/reclaim/fencing behavior.

The same services MUST use `@accounterbro/service-runtime/outbox/typeorm` for transactional Outbox persistence and compose its exported entities/migrations into the service-owned database. Bind the Outbox store to the transaction-aware `DataSource`. Publication is CDC-owned; services MUST NOT add a polling publisher, delivery status, published timestamps, retries, locks/leases, or a service-local Outbox adapter/schema.

Services that execute durable EDP UseCases MUST use `@accounterbro/service-runtime/use-case-execution/typeorm` and compose its exported entity/migration into the service-owned database. Construct this store from the real service-owned `DataSource`; it owns short atomic claim/complete/release transitions and does not participate in one transaction spanning child Operations/Reads. Services MUST NOT invent local UseCase execution tables, attempts/failure history, lease renewal/heartbeat, progress state, or serializers without a concrete reviewed requirement.

Use the official Nest `@nestjs/typeorm` lifecycle pattern: `TypeOrmModule.forRootAsync(...)` for the runtime connection and `TypeOrmModule.forFeature(...)` for hosted package/service entity registration. The service-local TypeORM CLI `DataSource` reuses the same typed service config and pure TypeORM options factory and composes package-owned migrations through their public `/typeorm` contracts.

MUST NOT deep-import or recreate a business package's private entities/migrations/persistence adapters in the service, add a custom database lifecycle service around `DataSource.initialize()` / `destroy()`, enable schema synchronization, auto-run migrations during application bootstrap, or share another service's persistence implementation.

## Business handler provisioning

When a service hosts business-package EDP Operation or Read handlers, MUST follow the corresponding handler provisioning rules in `docs/engineering/package-guidelines.md`.

The business package owns concrete handler classes and their construction knowledge and exposes Nest-compatible, Nest-agnostic provider descriptors through `@accounterbro/<package>/execution`. The service registers those exported descriptors; it MUST NOT deep-import concrete handlers, recreate handler factories, or duplicate their constructor dependencies.

Operation-side registration files are grouped by business package inside the execution infrastructure boundary:

```text
infrastructure/execution/providers/
├── documents/
│   └── documents-operation-handlers.providers.ts
├── banking/
│   └── banking-operation-handlers.providers.ts
└── <package>/
    └── <package>-operation-handlers.providers.ts
```

Read-handler registration follows the same package-first grouping rule inside the service's Read infrastructure boundary. A service registers the package-exported Read provider group from `/execution`; it MUST NOT introduce a second constructor-wiring mechanism or import concrete Read handler implementations directly.

A service-side provider file is composition only. It MAY use `satisfies Provider[]` or an equivalent Nest-side check to validate the package descriptors structurally without introducing Nest types into the business package.

## Operation and Read handler resolution

Use `OperationHandlerResolver` / `MapOperationHandlerResolver` and `ReadHandlerResolver` / `MapReadHandlerResolver` from `@accounterbro/service-runtime`; EDP remains the contract source of truth.

Each business package owns its Operation-name-to-handler and Read-name-to-handler binding groups and exposes their tokens/providers from `@accounterbro/<package>/execution`. A service MUST compose exactly one resolver of each kind from the package binding groups it hosts. It MUST NOT recreate mappings, deep-import concrete handlers for resolver wiring, or introduce service-specific resolver tokens.

AccounterBro requires exactly one handler per Operation name and exactly one handler per Read name. Duplicate bindings are invalid service composition and MUST fail during shared resolver construction. The EDP Read resolver contract represents a resolved handler set as a non-empty tuple; the shared AccounterBro Read resolver therefore supplies a singleton tuple only.

## Runner runtime composition

Services that execute EDP Operations MUST use `createServiceRunner(...)` from `@accounterbro/service-runtime/runner` rather than constructing the standard EDP Runner dependency graph locally.

The hosting service owns only process/runtime inputs: one shared EDP `SystemClock`, one fresh process-level `ExecutionLeaseOwnerId`, the service-wide `OperationHandlerResolver`, and the shared `ExecutionTransaction`, `ExecutionLogStore`, and `OutboxStore` instances. The same Clock instance MUST be reused for the process runtime. A lease owner identifies one running replica and MUST NOT be a stable logical service name shared by replicas.

The shared runtime owns the canonical EDP defaults and fixed `30_000` ms Runner lease duration. Services MUST NOT introduce local Runner implementations/wrappers, duplicate `DefaultExecutionIdFactory`, `DefaultEventIdFactory`, `DefaultOperationEventEnvelopeFactory`, or `DefaultOutboxRecordFactory` wiring, enable optional Runner policies, or add per-service lease-duration configuration without a concrete reviewed requirement.

Concrete Nest provider/module wiring remains service-owned composition, but it MUST delegate Runner construction to the shared runtime factory.

## Reader runtime composition

Services that execute EDP Queries MUST use `createServiceReader(...)` from `@accounterbro/service-runtime/reader` rather than constructing `DefaultReader` locally or introducing a service-specific Reader wrapper.

The baseline service composition supplies only the service-wide `ReadHandlerResolver`. EDP default timeout behavior remains canonical. Cache keys, levels, readers/writers, traversal and backfill remain Query-owned execution configuration rather than service-wide Reader policy.

`ReadExecutionCoordinator` and a custom read-execution owner-id factory are not part of the baseline. Add distributed coordination only when a concrete Query requires it and the corresponding runtime integration has been reviewed.

Concrete Nest provider/module wiring remains service-owned composition, but it MUST delegate Reader construction to the shared runtime factory.

## UseCaseExecutor runtime composition

Services that execute durable EDP UseCases MUST use `createServiceUseCaseExecutor(...)` from `@accounterbro/service-runtime/use-case-executor` rather than constructing the standard EDP executor dependency graph locally.

The hosting service supplies the same process `SystemClock` and fresh process-level `ExecutionLeaseOwnerId` already used by Runner composition plus the shared `UseCaseExecutionStore`. Shared runtime wires EDP `DefaultExecutionIdFactory` and delegates construction to `createUseCaseExecutor()`.

EDP owns UseCaseExecutor lease duration, claim/replay/release, transition/error, and execution semantics. Services MUST NOT add a local executor implementation/wrapper, lease-duration configuration, alternate lease policy, retry policy, UseCase registry/resolver, or executor-specific process identity merely for composition.

Concrete UseCases remain caller-supplied through EDP execution requests. Concrete Nest provider/module wiring remains service-owned composition, but it MUST delegate executor construction to the shared runtime factory.

## Concrete UseCase dependency and context boundary

Concrete service UseCases MUST be Nest `@Injectable()` providers using the default singleton scope unless a concrete reviewed requirement proves another scope is necessary.

Constructor dependencies are reserved for stable reusable dependencies of the UseCase, such as Runner, Reader, storage capabilities, repositories, or other long-lived collaborators. Invocation-specific metadata MUST NOT be stored in the singleton instance or supplied through request-scoped DI merely for convenience.

Each UseCase MUST define its own concrete context type extending EDP `UseCaseContext` with exactly the additional invocation metadata that UseCase requires. Keep that type beside the UseCase in `<use-case-name>.use-case.context.ts`. Actor, tenant, and similar per-invocation values belong in this concrete execution context when required.

Use EDP's typed concrete-context support end-to-end through `UseCaseExecutor`; do not reconstruct or hide invocation metadata through AsyncLocalStorage, ambient current-user/current-tenant providers, casts, or wrapper executors.

UseCase behavioral tests are specification-level tests. They MUST verify observable behavior required by the owning specification and MUST NOT assert Nest DI scope, constructor shape, context-file placement, whether metadata came from constructor vs context, or EDP implementation mechanics unless the specification itself makes such behavior observable.

## UseCase implementation preflight

Before designing or modifying a concrete UseCase, MUST inspect the current implementation and semantics of the execution boundaries that UseCase will actually use:

- `UseCaseExecutor` for durable UseCase execution;
- `Runner` for child Operations and `Reader` for child Reads, when those paths are used;
- every concrete Operation/Read invoked by the UseCase and its handler;
- the handler's persistence/DB implementation and constraints when they own behavior relevant to deduplication, idempotency, transactions, recovery, concurrency, or result semantics.

The purpose of this inspection is to establish ownership before adding orchestration logic. MUST NOT add a UseCase-local check, recovery Read, idempotency/deduplication mechanism, retry policy, progress state, transaction workaround, concurrency guard, or other execution behavior until inspection proves that the EDP runtime and called Operation/Read/persistence boundaries do not already own the required semantics.

Findings that constrain the implementation MUST be copied into the UseCase task's required `## Do not` section. Those entries MUST name the concrete existing owner/mechanism where practical; they MUST NOT be reduced to a generic instruction such as "do not duplicate EDP behavior".

Service tests MUST cover service-owned composition only. They MUST NOT duplicate EDP resolver/Runner/Reader/UseCase semantics already owned and tested by EDP.
