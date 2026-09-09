# API Agent Rules

These rules apply to `apps/api` in addition to the root workspace rules.

## Canonical guidance

Reusable service architecture, dependency direction, UseCase/runtime consumption, and testing rules are owned by `docs/engineering/service-guidelines.md`.

Read the responsibility-specific engineering guide before changing API behavior:

- `docs/engineering/http-presenter-guidelines.md` for HTTP presenters and HTTP error/OpenAPI presentation;
- `docs/engineering/observability-and-http-errors.md` for shared observability and failure ownership;
- `docs/engineering/database-guidelines.md` for PostgreSQL/TypeORM lifecycle and migrations;
- `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md` for configuration.

Do not restate those reusable rules here.

## API-local role

`apps/api` is the current small internal HTTP-host reference. It owns its Nest bootstrap, typed API configuration, PostgreSQL/TypeORM runtime lifecycle, global `/api` prefix, and shutdown-hook enablement while composing reusable runtime capabilities.

API currently has no business controller/execution pipeline and therefore no hosted Runner, Reader, UseCaseExecutor, execution stores, or other business EDP runtime graph. Do not add those capabilities solely for symmetry with a business service.

API configuration references are:

- `src/app/infrastructure/config/api-env.schema.ts`;
- `src/app/infrastructure/config/api.config.ts`;
- `src/app/infrastructure/config/api-config.module.ts`;
- `src/main.ts`.

The current service-owned TypeORM lifecycle/CLI reference is `src/app/infrastructure/persistence/typeorm/`.

## Verification

For API changes, run the relevant subset of the existing Nx targets:

```bash
pnpm nx run @accounterbro/api:lint
pnpm nx run @accounterbro/api:typecheck
pnpm nx run @accounterbro/api:test
pnpm nx run @accounterbro/api:build
```

When persistence composition changes, include the relevant PostgreSQL-backed integration/migration verification. When HTTP behavior or end-to-end wiring changes, include the relevant API E2E target.
