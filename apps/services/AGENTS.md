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

## Database and migrations

When a service owns PostgreSQL persistence, MUST follow `docs/engineering/database-guidelines.md`.

When a service hosts a TypeORM-backed business package, MUST also follow the TypeORM integration rules in `docs/engineering/package-guidelines.md`: the service owns the real Nest/TypeORM `DataSource` lifecycle and connection configuration; the business package owns its business TypeORM entities/migrations and exposes them through `@accounterbro/<package>/typeorm` composition contracts.

Persistence ports used as Nest DI tokens MUST come from the package's `/typeorm` entrypoint as runtime values, and the service MUST bind them to the package-exported factory by injecting the service-owned `DataSource`. Provider files are grouped by package under `infrastructure/persistence/typeorm/providers/<package>/`; the service MUST NOT recreate package adapter construction or deep-import package persistence internals.

Services that execute EDP Operations transactionally MUST use the shared `@accounterbro/service-runtime/typeorm` transaction boundary described in `docs/engineering/database-guidelines.md`: keep the real Nest-managed `DataSource` as lifecycle owner, share one `TypeOrmTransactionContext`, pass the transaction-aware `DataSource` to package persistence factories, and use the shared TypeORM `ExecutionTransaction` adapter. MUST NOT implement service-local `AsyncLocalStorage`, `QueryRunner`, or repository-switching transaction plumbing.

The same services MUST use the shared `@accounterbro/service-runtime/execution-log/typeorm` adapter and compose its exported entities/migrations into that service's own database. Bind the store to the transaction-aware `DataSource`; do not create a Documents-specific execution-log adapter, central execution-log database, or service-local copy of claim/reclaim/fencing behavior.

The same services MUST use `@accounterbro/service-runtime/outbox/typeorm` for transactional Outbox persistence and compose its exported entities/migrations into the service-owned database. Bind the Outbox store to the transaction-aware `DataSource`. Publication is CDC-owned; services MUST NOT add a polling publisher, delivery status, published timestamps, retries, locks/leases, or a service-local Outbox adapter/schema.

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

Service tests MUST cover service-owned composition only. They MUST NOT duplicate EDP resolver/Runner/Reader/UseCase semantics already owned and tested by EDP.
