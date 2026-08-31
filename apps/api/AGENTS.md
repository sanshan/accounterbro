# API Agent Rules

These rules apply to `apps/api` in addition to the root workspace rules and `docs/engineering/service-guidelines.md`.

Reusable service layer, dependency-direction, UseCase, DI, runtime-consumption, and testing rules belong to `docs/engineering/service-guidelines.md`; shared observability/failure ownership belongs to `docs/engineering/observability-and-http-errors.md`. Do not restate them here.

## API role and canonical reference

`apps/api` is the current reference for a small internal HTTP host that owns its Nest bootstrap, typed configuration, and PostgreSQL/TypeORM lifecycle while composing reusable runtime capabilities.

API also proves that a service can consume shared Pino/OpenTelemetry and ordinary RFC 9457 error composition without Runner, Reader, or UseCaseExecutor when it has no hosted business EDP pipeline.

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

The API owns its global `/api` prefix, shutdown-hook enablement, real `DataSource` lifecycle/configuration, and Nest composition. The shared runtime packages own observability, ordinary HTTP error adaptation, health HTTP adaptation, and database readiness probe/schema artifacts.

MUST NOT recreate an API-local health controller, indicator, UseCase, port, repository, probe model, entity, mapper, or duplicate health migration while the shared runtime capabilities own those responsibilities.

## Module composition

The API keeps `src/app/application/` and `ApplicationModule` as a stable Nest composition boundary even when there are currently no concrete application UseCases.

The module chain is:

```text
PresentersModule -> ApplicationModule -> InfrastructureModule
```

`ApplicationModule` imports `InfrastructureModule` and re-exports the infrastructure capabilities required by presenter composition. `PresentersModule` imports `ApplicationModule`; it MUST NOT import `InfrastructureModule` directly merely because the application layer currently has no providers of its own.

Do not remove `ApplicationModule` as an empty-layer cleanup. Its presence preserves the service dependency/composition boundary for future application behavior without changing presenter composition.

## Runtime observability and ordinary HTTP errors

API consumes `RuntimeObservabilityModule` from `@accounterbro/runtime-observability/nest` at the host boundary. Bootstrap uses the shared Nest/Pino logger with structured startup logging. Do not reintroduce default string-only startup logging or create API-local logger configuration, exporters, trace helpers, or EDP observer providers.

`PresentersModule` composes `HttpErrorsModule` from `@accounterbro/runtime-presenters/http/errors/nest` for ordinary application/framework failures. Canonical Problem Details definitions and mappings remain shared under `/http/errors`; API MUST NOT add a local exception filter, Problem Details DTO, or mapping table.

API currently has no business controller/execution pipeline requiring EDP execution. MUST NOT add Runner, Reader, UseCaseExecutor, execution stores, or EDP retry/failure plumbing solely for observability symmetry.

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

`PresentersModule` is the API-owned composition point for the shared HTTP health adapter. It reaches the API's Nest-managed `DataSource` through the preserved `ApplicationModule -> InfrastructureModule` module chain and supplies the shared TypeORM database readiness check. Presenters MUST NOT import the service infrastructure module directly for this composition.

Liveness remains independent of external infrastructure. Readiness currently contains only the shared database check. Add another readiness check only when the API has a concrete additional dependency that should affect readiness.

The API MUST NOT route health through `UseCaseExecutor`, Runner, Reader, or another durable EDP execution path solely for structural symmetry. It also MUST NOT convert Terminus health failures to Problem Details, special-case health URL strings in the generic ordinary-error filter, or add ordinary `@ApiEndpoint` error declarations to health methods.

## API E2E

`apps/api-e2e` owns real HTTP integration through the running API application. The health E2E is the canonical evidence that API composition preserves `/api/health/live` and `/api/health/ready` and that database readiness works through the real service `DataSource`.

The ordinary unknown-route E2E is the API-owned evidence that the same running host uses the shared `application/problem+json` envelope, may expose a safe active `traceId`, and does not expose stack/cause. It MUST NOT be replaced with an artificial production failure endpoint.

Shared health/error/telemetry behavior itself belongs to runtime package tests. API tests MUST NOT duplicate those lower-boundary semantics.

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
