# Internal Service Database Guidelines

These rules define the canonical PostgreSQL and TypeORM integration for internal Nest services in AccounterBro.

The pattern intentionally follows the official NestJS `@nestjs/typeorm` and TypeORM APIs instead of introducing a repository-owned database lifecycle abstraction.

## Vendor lifecycle ownership

For a Nest runtime, `TypeOrmModule.forRootAsync(...)` owns creation, initialization, registration, and shutdown of the TypeORM `DataSource`.

MUST NOT add a custom `DatabaseService` or custom async provider whose only purpose is to call `new DataSource(...).initialize()` / `destroy()`. Nest already exposes the initialized `DataSource` and `EntityManager` through dependency injection.

Feature persistence registration uses `TypeOrmModule.forFeature(...)`.

The TypeORM CLI is a separate process and requires a service-local exported `DataSource`. That CLI adapter does not become the runtime lifecycle owner.

## Database ownership

Each internal service owns one logical database boundary:

- its service-owned database configuration;
- its TypeORM entities and repositories;
- its migrations and migration history;
- its runtime `DataSource`.

Logical ownership does not require one physical PostgreSQL server or cluster per service. Deployment may colocate independently owned databases while keeping service persistence boundaries isolated.

A service MUST NOT import another service's entities, repositories, migrations, or `DataSource`.

Service-specific database environment variables follow the ownership rules from `docs/engineering/environment-guidelines.md` and use the owning service prefix, for example `API_DB_*` or `DOCUMENTS_DB_*`.

## Canonical service structure

For a service named `<service>`:

```text
infrastructure/persistence/typeorm/
├── <service>-typeorm.module.ts
├── typeorm-options.ts
├── data-source.ts
├── entities/
├── repositories/
└── migrations/
```

### `<service>-typeorm.module.ts`

Owns the Nest runtime integration.

Use `TypeOrmModule.forRootAsync(...)` with the typed service config from `docs/engineering/service-configuration-guidelines.md`.

The runtime options factory MUST reuse the service-local pure TypeORM connection-options factory and may add Nest-only options such as:

```ts
autoLoadEntities: true
```

Register persistence entities in the owning module through `TypeOrmModule.forFeature(...)`.

Do not manually initialize or destroy the `DataSource`.

### `typeorm-options.ts`

Owns pure mapping from the typed service database config to the common TypeORM connection options used by runtime and CLI.

The factory MUST:

- accept typed service database config rather than `process.env`;
- map host, port, username, password, and database name once;
- set `synchronize: false`;
- avoid Nest module/lifecycle concerns;
- avoid entity/migration discovery concerns that differ between runtime and CLI.

This factory is service-local. Do not create a generic shared database package until multiple proven consumers require behavior that cannot remain a small repeated vendor integration shell.

### `data-source.ts`

Exists for the TypeORM CLI contract.

It MUST:

- obtain configuration through the same callable service config factory used by Nest registration;
- reuse `typeorm-options.ts`;
- add explicit service-owned entity and migration discovery required by the CLI;
- export a `DataSource` instance for the TypeORM `-d` option;
- keep `migrationsRun: false`;
- contain no duplicate raw environment parsing or duplicate host/port/user/password/database mapping.

It MUST NOT be imported as the Nest runtime connection provider.

## Runtime DataSource and observability

The Nest-managed `DataSource` is the canonical runtime database object.

Infrastructure concerns that genuinely need runtime database state, including future health or observability adapters, may inject the Nest-managed `DataSource` directly or use Nest's `@InjectDataSource()` helper when named data sources are introduced.

Such adapters may observe the data source/driver/pool but MUST NOT take ownership of initialization or shutdown.

Do not expose `DataSource` to application/domain code.

## Schema evolution

Schema evolution is migration-driven.

MUST:

- keep `synchronize: false`;
- keep migrations under the owning service's `infrastructure/persistence/typeorm/migrations/` directory;
- use TypeORM migrations for schema changes;
- keep application bootstrap from silently applying pending migrations.

A migration contains both `up` and, when safely possible, `down` behavior. Review generated SQL before relying on a generated migration.

## Canonical migration commands

Every database-owning service exposes Nx targets backed by its package scripts for:

```text
migration:generate
migration:run
migration:revert
migration:show
```

The package scripts invoke the repository-installed TypeORM CLI with the service-local `data-source.ts` through `-d`.

Run normal migration commands through Nx from the repository root so environment loading follows `docs/engineering/environment-guidelines.md`.

For the API reference, the canonical commands are:

```bash
pnpm nx run @accounterbro/api:migration:generate --name=CreateSomething
pnpm nx run @accounterbro/api:migration:show
pnpm nx run @accounterbro/api:migration:run
pnpm nx run @accounterbro/api:migration:revert
```

A generated service uses the same target names with its own Nx project identity.

Generation MUST target the owning service migration directory. TypeORM generates timestamp-prefixed migration files from entity/schema differences.

`migration:run` applies pending migrations, `migration:show` reports applied/pending state, and `migration:revert` reverts the latest applied migration.

## Local, CI, and deployment behavior

Local development and CI supply the owning service's environment externally and run migrations explicitly.

CI SHOULD apply migrations before database-backed tests and runtime smoke checks.

Deployment MUST have an explicit migration step/job before runtime code depends on a new incompatible schema. Runtime bootstrap MUST NOT use `migrationsRun: true` as a substitute for deployment orchestration.

## Canonical API reference

`apps/api` is the proven reference for this pattern:

- `apps/api/src/app/infrastructure/config/api.config.ts` exposes the callable typed service config factory;
- `apps/api/src/app/infrastructure/persistence/typeorm/typeorm-options.ts` owns common TypeORM connection options;
- `apps/api/src/app/infrastructure/persistence/typeorm/api-typeorm.module.ts` uses `TypeOrmModule.forRootAsync(...)` and `TypeOrmModule.forFeature(...)` for runtime;
- `apps/api/src/app/infrastructure/persistence/typeorm/data-source.ts` is the CLI-only `DataSource` adapter;
- migrations live under the same TypeORM persistence boundary.

## Generator contract

The service generator from issue #43 may reproduce only the reusable vendor integration shell:

- service-prefixed DB env/config fields;
- service-local `typeorm-options.ts`;
- Nest `TypeOrmModule.forRootAsync(...)` shell;
- CLI `data-source.ts` shell;
- empty service-owned `entities/`, `repositories/`, and `migrations/` locations when required by generated project structure;
- migration targets/scripts.

The generator MUST NOT copy API-specific entities, health behavior, migrations, repository adapters, physical database topology, or a custom database lifecycle abstraction.
