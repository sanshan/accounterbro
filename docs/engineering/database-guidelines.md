# Internal Service Database Guidelines

These rules define the canonical PostgreSQL and TypeORM integration for internal Nest services in AccounterBro.

The pattern intentionally follows the official NestJS `@nestjs/typeorm` and TypeORM APIs instead of introducing a repository-owned database lifecycle abstraction.

## Vendor lifecycle ownership

For a Nest runtime, `TypeOrmModule.forRootAsync(...)` owns creation, initialization, registration, and shutdown of the service's real TypeORM `DataSource`.

MUST NOT add a custom `DatabaseService` or custom async provider whose only purpose is to call `new DataSource(...).initialize()` / `destroy()`. Nest already exposes the initialized `DataSource` and `EntityManager` through dependency injection.

Feature persistence registration uses `TypeOrmModule.forFeature(...)`. When a hosted business package owns TypeORM persistence, the service registers the package contribution exposed from `@accounterbro/<package>/typeorm`; it does not import the package's private entity files.

The TypeORM CLI is a separate process and requires a service-local exported `DataSource`. That CLI adapter does not become the runtime lifecycle owner.

## Database ownership

Each internal service owns one logical database runtime boundary:

- its service-owned database configuration and credentials;
- its runtime `DataSource` and connection-pool lifecycle;
- migration execution for that database and its migration history.

Business packages hosted by the service own the TypeORM schema artifacts for their own business state, including their entities and migrations. The service composes those package-owned artifacts into its service-owned database runtime rather than copying or re-owning them.

A service may additionally own entities and migrations for persistence that genuinely belongs to the service/runtime boundary rather than to a business package. Artifact ownership follows the state/concern that owns the schema; `DataSource` lifecycle ownership remains with the service in all cases.

Logical ownership does not require one physical PostgreSQL server or cluster per service. Deployment may colocate independently owned databases while keeping service persistence boundaries isolated.

A service MUST NOT import another service's entities, repositories, migrations, or `DataSource`.

Service-specific database environment variables follow the ownership rules from `docs/engineering/environment-guidelines.md` and use the owning service prefix, for example `API_DB_*` or `DOCUMENTS_DB_*`.

## Business-package TypeORM contributions

A TypeORM-backed business package exposes a dedicated Nest-agnostic integration entrypoint such as:

```text
@accounterbro/<package>/typeorm
```

That entrypoint owns public composition contracts for the package's ORM artifacts, for example:

```ts
export const DOCUMENTS_TYPEORM_ENTITIES = [DocumentEntity] as const;
export const DOCUMENTS_TYPEORM_MIGRATIONS = [CreateDocumentsMigration] as const;
```

The hosting service MUST consume those public contracts. It MUST NOT deep-import package entity/migration implementation files or move those artifacts into the service merely to satisfy Nest or the TypeORM CLI.

The package TypeORM entrypoint may depend on TypeORM but remains Nest-agnostic. The package does not create or manage the service `DataSource`.

## Canonical service structure

For a service named `<service>`:

```text
infrastructure/persistence/typeorm/
├── <service>-typeorm.module.ts
├── typeorm-options.ts
├── data-source.ts
└── migrations/                 # only service-owned schema artifacts, when needed
```

Business-package entities/migrations remain in their owning packages and are composed through each package's `/typeorm` entrypoint. Empty generator-owned `entities/`, `repositories/`, or `migrations/` directories are not evidence that hosted business schema belongs to the service.

### `<service>-typeorm.module.ts`

Owns the Nest runtime integration.

Use `TypeOrmModule.forRootAsync(...)` with the typed service config from `docs/engineering/service-configuration-guidelines.md`.

The runtime options factory MUST reuse the service-local pure TypeORM connection-options factory and may add Nest-only options such as:

```ts
autoLoadEntities: true
```

Register package-owned persistence entities through their public composition contracts:

```ts
import { DOCUMENTS_TYPEORM_ENTITIES } from '@accounterbro/documents/typeorm';

TypeOrmModule.forFeature([
  ...DOCUMENTS_TYPEORM_ENTITIES,
]);
```

A service hosting multiple business packages composes each package's entity contract into the same service-owned persistence boundary as required by that service.

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
- compose explicit entities and migrations for the schema hosted by that service, including package-owned contributions through their public `/typeorm` contracts and any genuinely service-owned artifacts;
- export a `DataSource` instance for the TypeORM `-d` option;
- keep `migrationsRun: false`;
- contain no duplicate raw environment parsing or duplicate host/port/user/password/database mapping.

It MUST NOT deep-import private package entity/migration files and MUST NOT be imported as the Nest runtime connection provider.

## Runtime DataSource and observability

The Nest-managed `DataSource` is the canonical runtime database object.

Infrastructure concerns that genuinely need runtime database state, including future health or observability adapters, may inject the Nest-managed `DataSource` directly or use Nest's `@InjectDataSource()` helper when named data sources are introduced.

Such adapters may observe the data source/driver/pool but MUST NOT take ownership of initialization or shutdown.

Do not expose `DataSource` to application/domain code.

## Schema evolution

Schema evolution is migration-driven.

MUST:

- keep `synchronize: false`;
- keep a migration with the schema owner: business-package migrations remain in that package's TypeORM persistence boundary; genuinely service-owned schema migrations remain in the service TypeORM persistence boundary;
- use TypeORM migrations for schema changes;
- compose all migrations required by the service database into the service-local CLI `DataSource`;
- keep application bootstrap from silently applying pending migrations.

The hosting service owns migration execution/order and migration history for its database even when a migration class is contributed by a business package.

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

Migration generation output MUST be placed with the owner of the schema being changed. A service-local migration target is appropriate only for genuinely service-owned schema; a business-package schema change belongs with that package's TypeORM artifacts. Do not relocate package migrations into a service merely because the service owns the CLI `DataSource`.

`migration:run` applies pending migrations, `migration:show` reports applied/pending state, and `migration:revert` reverts the latest applied migration.

## Local, CI, and deployment behavior

Local development and CI supply the owning service's environment externally and run migrations explicitly.

CI SHOULD apply migrations before database-backed tests and runtime smoke checks.

Deployment MUST have an explicit migration step/job before runtime code depends on a new incompatible schema. Runtime bootstrap MUST NOT use `migrationsRun: true` as a substitute for deployment orchestration.

## Canonical API reference

`apps/api` remains the proven reference for the service-owned `DataSource` lifecycle/configuration shell:

- `apps/api/src/app/infrastructure/config/api.config.ts` exposes the callable typed service config factory;
- `apps/api/src/app/infrastructure/persistence/typeorm/typeorm-options.ts` owns common TypeORM connection options;
- `apps/api/src/app/infrastructure/persistence/typeorm/api-typeorm.module.ts` uses `TypeOrmModule.forRootAsync(...)` for runtime;
- `apps/api/src/app/infrastructure/persistence/typeorm/data-source.ts` is the CLI-only `DataSource` adapter.

When a business service hosts a TypeORM-backed business package, extend that shell by composing package-owned entity/migration contracts from `@accounterbro/<package>/typeorm`; do not use API's service-owned schema layout as a reason to move business-package artifacts into the service.

## Generator contract

The service generator from issue #43 may reproduce only the reusable vendor integration shell:

- service-prefixed DB env/config fields;
- service-local `typeorm-options.ts`;
- Nest `TypeOrmModule.forRootAsync(...)` shell;
- CLI `data-source.ts` shell;
- empty service-local `entities/`, `repositories/`, and `migrations/` locations when retained by generated project structure for future genuinely service-owned persistence;
- migration targets/scripts.

The generator MUST NOT copy API-specific entities, health behavior, migrations, repository adapters, physical database topology, package-owned business entities/migrations, or a custom database lifecycle abstraction.

Adding a business package to a generated service is a composition step: consume that package's public TypeORM integration contracts rather than modifying the generator to copy package persistence artifacts.
