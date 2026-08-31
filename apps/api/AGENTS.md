# API Agent Rules

These rules apply to `apps/api` in addition to the root workspace rules and `docs/engineering/service-guidelines.md`.

Reusable service architecture, runtime observability/failure ownership, and HTTP presenter rules belong to the engineering guides; do not restate their implementation recipes here.

## API role and canonical reference

`apps/api` is the current reference for a small internal HTTP host that owns its Nest bootstrap, typed configuration, and PostgreSQL/TypeORM lifecycle while composing reusable runtime capabilities.

It also proves an important runtime boundary: a service may consume shared Pino/OpenTelemetry and ordinary RFC 9457 HTTP error composition without adding Runner, Reader, or UseCaseExecutor when it has no business execution pipeline.

The API owns its global `/api` prefix, shutdown-hook enablement, real `DataSource` lifecycle/configuration, and Nest composition. Shared runtime packages own observability, ordinary HTTP error adaptation, health HTTP adaptation, and database readiness artifacts.

## Module composition

The API keeps `src/app/application/` and `ApplicationModule` as a stable Nest composition boundary even when there are currently no concrete application UseCases.

The module chain is:

```text
PresentersModule -> ApplicationModule -> InfrastructureModule
```

`ApplicationModule` imports `InfrastructureModule` and re-exports infrastructure capabilities required by presenter composition. `PresentersModule` imports `ApplicationModule`; it MUST NOT import `InfrastructureModule` directly merely because the application layer currently has no providers of its own.

Do not remove `ApplicationModule` as empty-layer cleanup.

## Runtime observability and ordinary HTTP errors

API consumes `RuntimeObservabilityModule` from `@accounterbro/runtime-observability/nest` at the application host boundary. Bootstrap uses the shared Nest/Pino logger and structured startup logging. Do not reintroduce default string-only Nest startup logging, an API-local logger configuration, exporter, trace helper, or EDP observer provider.

`PresentersModule` composes `HttpErrorsModule` from `@accounterbro/runtime-presenters/http/errors/nest` for ordinary application/framework failures. The canonical Problem Details definitions and mappings remain shared; API MUST NOT add a local exception filter, Problem Details DTO, or mapping table.

API currently has no business controllers or hosted EDP execution pipeline, so it MUST NOT add Runner, Reader, UseCaseExecutor, execution stores, or EDP failure plumbing merely for structural symmetry. If future business behavior needs those capabilities, follow the shared service/runtime contracts then.

The detailed logging, classification, retry, trace/correlation, redaction, and HTTP error rules are owned by `docs/engineering/observability-and-http-errors.md`.

## Configuration

API configuration is the current proven reference for internal service configuration:

- `src/app/infrastructure/config/api-env.schema.ts`;
- `src/app/infrastructure/config/api.config.ts`;
- `src/app/infrastructure/config/api-config.module.ts`;
- `src/main.ts`.

Configuration changes MUST follow `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md`.

Do not introduce a second API configuration mechanism, project-local `.env` loading, or direct `process.env` access outside the documented configuration boundary.

## Persistence

API owns its PostgreSQL/TypeORM runtime boundary. Persistence changes MUST follow `docs/engineering/database-guidelines.md`; the current `src/app/infrastructure/persistence/typeorm/` implementation is the proven service-owned TypeORM lifecycle/CLI reference.

Shared health TypeORM entities and migrations are composed from `@accounterbro/runtime-health/typeorm`. The shared database readiness check receives the already-initialized Nest-managed `DataSource`; it MUST NOT create, initialize, configure, or destroy another production `DataSource`.

The historical migration identity `CreateDatabaseHealthProbes1787040000000` is owned by the shared health package and remains the same logical migration for existing API databases.

Do not expose TypeORM entities/repositories/DataSource to application/domain code merely for convenience.

## Health composition

API health is a separate shared system contract:

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

`PresentersModule` reaches the API's Nest-managed `DataSource` through the preserved `ApplicationModule -> InfrastructureModule` chain and supplies the shared database readiness check. Presenters MUST NOT import the service infrastructure module directly.

Liveness remains independent of external infrastructure. Readiness currently contains only the shared database check.

The API MUST NOT route health through UseCaseExecutor/Runner/Reader, convert Terminus health failures to Problem Details, special-case health URLs in the ordinary error filter, or add ordinary `@ApiEndpoint` error declarations to health methods.

## API E2E

`apps/api-e2e` owns running-service integration evidence.

The canonical evidence is intentionally small:

- `/api/health/live` and `/api/health/ready` preserve established Terminus semantics and database readiness through the real API `DataSource`;
- an ordinary unknown `/api/...` route uses the shared `application/problem+json` envelope, may expose a safe active `traceId`, and does not expose stack/cause.

Shared health/error/telemetry semantics belong to their runtime-package tests. API E2E MUST NOT duplicate those lower-boundary tests or add artificial production failure endpoints.

## Verification

For API changes, run the relevant subset of existing Nx targets:

```bash
pnpm nx run @accounterbro/api:lint
pnpm nx run @accounterbro/api:typecheck
pnpm nx run @accounterbro/api:test
pnpm nx run @accounterbro/api:build
```

When persistence composition changes, include relevant PostgreSQL-backed integration/migration verification. When HTTP behavior or end-to-end wiring changes, include the API E2E target.

Do not declare API work complete while relevant API checks are known to fail.
