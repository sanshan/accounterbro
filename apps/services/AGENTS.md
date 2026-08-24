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

Use the official Nest `@nestjs/typeorm` lifecycle pattern: `TypeOrmModule.forRootAsync(...)` for the runtime connection and `TypeOrmModule.forFeature(...)` for hosted package/service entity registration. The service-local TypeORM CLI `DataSource` reuses the same typed service config and pure TypeORM options factory and composes package-owned migrations through their public `/typeorm` contracts.

MUST NOT deep-import or recreate a business package's private entities/migrations/persistence adapters in the service, add a custom database lifecycle service around `DataSource.initialize()` / `destroy()`, enable schema synchronization, auto-run migrations during application bootstrap, or share another service's persistence implementation.

## Business handler provisioning

When a service hosts business-package EDP Operation handlers, MUST follow the Operation handler provisioning rules in `docs/engineering/package-guidelines.md`.

The business package owns concrete handler classes and their construction knowledge and exposes Nest-compatible, Nest-agnostic provider descriptors through `@accounterbro/<package>/execution`. The service registers those exported descriptors; it MUST NOT deep-import concrete handlers, recreate handler factories, or duplicate their constructor dependencies.

Service-side registration files are grouped by business package inside the execution infrastructure boundary:

```text
infrastructure/execution/providers/
├── documents/
│   └── documents-operation-handlers.providers.ts
├── banking/
│   └── banking-operation-handlers.providers.ts
└── <package>/
    └── <package>-operation-handlers.providers.ts
```

A service-side provider file is composition only. It MAY use `satisfies Provider[]` or an equivalent Nest-side check to validate the package descriptors structurally without introducing Nest types into the business package.

## Operation handler resolution

Use `OperationHandlerResolver` and `MapOperationHandlerResolver` from `@accounterbro/service-runtime`; EDP remains the behavioral contract source of truth.

Each business package owns its Operation-name-to-handler binding group and exposes its binding token/provider from `@accounterbro/<package>/execution`. A service MUST compose exactly one resolver from the package binding groups it hosts. It MUST NOT recreate Operation-name-to-handler mappings, deep-import concrete handlers for resolver wiring, or introduce a service-specific resolver token such as `SERVICE_OPERATION_HANDLER_RESOLVER`.

Service tests MUST cover service-owned composition only. They MUST NOT duplicate EDP resolver/Runner/Reader/UseCase semantics already owned and tested by EDP.
