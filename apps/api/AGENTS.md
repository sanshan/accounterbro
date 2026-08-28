# API Agent Rules

These rules apply to `apps/api` in addition to the root workspace rules and `docs/engineering/service-guidelines.md`.

Reusable service layer, dependency-direction, UseCase, DI, runtime-consumption, and testing rules belong to `docs/engineering/service-guidelines.md`; do not restate them here.

## API role and canonical reference

`apps/api` is the current reference for a small internal HTTP host that owns its Nest bootstrap, typed configuration, and PostgreSQL/TypeORM lifecycle while composing reusable runtime capabilities.

API health is no longer an API-owned vertical slice. The canonical flow is:

```text
HTTP / Terminus
      ↓
@accounterbro/runtime-presenters/http/health
      ↓
ReadinessCheck
      ↓
@accounterbro/runtime-health/typeorm
      ↓
API Nest-managed DataSource
```

The API owns its global `/api` prefix, shutdown-hook enablement, real `DataSource` lifecycle/configuration, and Nest composition. The shared runtime packages own health HTTP adaptation and the database readiness probe/schema artifacts.

MUST NOT recreate an API-local health controller, indicator, UseCase, port, repository, probe model, entity, mapper, or duplicate health migration while the shared runtime capabilities own those responsibilities.

## Configuration

API configuration is the current proven reference for internal service configuration:

- `src/app/infrastructure/config/api-env.schema.ts`;
- `src/app/infrastructure/config/api.config.ts`;
- `src/app/infrastructure/config/api-config.module.ts`;
- `src/main.ts`.

Configuration changes MUST follow `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md`.

Do not introduce a second API configuration mechanism, project-local `.env` loading, or direct `process.env` access outside the documented configuration boundary.

## Persistence

API owns its PostgreSQL/TypeORM runtime boundary. Persistence changes MUST follow `docs/engineering/database-guidelines.md`; the current `src/app/infrastructure/persistence/typeorm/` implementation is the proven service-owned TypeORM lifecycle/CLI reference described there.

Shared health TypeORM entities and migrations are composed from `@accounterbro/runtime-health/typeorm`. The API MUST NOT deep-import or duplicate those artifacts. The shared database readiness check receives the already-initialized Nest-managed `DataSource`; it MUST NOT create, initialize, configure, or destroy another production `DataSource`.

The historical migration identity `CreateDatabaseHealthProbes1787040000000` is owned by the shared health package and must remain the same logical migration for existing API databases.

Do not expose TypeORM entities/repositories/DataSource to application/domain code merely for convenience.

## Health composition

`PresentersModule` is the API-owned composition point for the shared HTTP health adapter. It supplies the shared TypeORM database readiness check using the API's Nest-managed `DataSource`.

Liveness remains independent of external infrastructure. Readiness currently contains only the shared database check. Add another readiness check only when the API has a concrete additional dependency that should affect readiness.

The API MUST NOT route health through `UseCaseExecutor`, Runner, Reader, or another durable EDP execution path solely for structural symmetry.

## API E2E

`apps/api-e2e` owns real HTTP integration through the running API application. The health E2E is the canonical evidence that API composition preserves `/api/health/live` and `/api/health/ready` and that database readiness works through the real service `DataSource`.

Shared health behavior itself belongs to `runtime-health` and `runtime-presenters` tests. API tests MUST NOT duplicate those lower-boundary semantics.

## Verification

For API changes, run the relevant subset of the existing Nx targets:

```bash
pnpm nx run @accounterbro/api:lint
pnpm nx run @accounterbro/api:typecheck
pnpm nx run @accounterbro/api:test
pnpm nx run @accounterbro/api:build
```

When persistence composition changes, include the relevant PostgreSQL-backed integration/migration verification. When HTTP behavior or end-to-end wiring changes, include the relevant API E2E target.

Do not declare API work complete while relevant API checks are known to fail.
