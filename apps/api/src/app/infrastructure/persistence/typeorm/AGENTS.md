# API TypeORM Persistence Rules

These rules apply to the API TypeORM persistence boundary in addition to root and `apps/api/AGENTS.md`.

Follow `docs/engineering/database-guidelines.md`. This directory is the proven database reference for future internal services.

MUST:

- keep Nest runtime lifecycle in `TypeOrmModule.forRootAsync(...)`;
- keep common typed connection mapping in `typeorm-options.ts`;
- keep `data-source.ts` as the TypeORM CLI adapter only;
- register persistence entities/repositories through `TypeOrmModule.forFeature(...)`;
- keep `synchronize: false` and schema evolution migration-driven;
- keep migrations under `migrations/`.

MUST NOT:

- manually initialize/destroy the runtime `DataSource`;
- duplicate raw environment parsing or connection-field mapping in `data-source.ts`;
- auto-run migrations at application bootstrap;
- expose TypeORM persistence types to application/domain code.

The Nest-managed `DataSource` may be injected by infrastructure health/observability adapters when required, but those adapters do not own its lifecycle.
