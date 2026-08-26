# API Agent Rules

These rules apply to `apps/api` in addition to the root workspace rules and `docs/engineering/service-guidelines.md`.

Reusable service layer, dependency-direction, UseCase, DI, runtime-consumption, and testing rules belong to `docs/engineering/service-guidelines.md`; do not restate them here.

## API role and canonical reference

`apps/api` currently owns the system health/readiness vertical slice. Use that implementation as the proven reference when changing the same API-owned responsibility:

```text
HTTP / Terminus
      ↓
HealthController / DatabaseHealthIndicator
      ↓
CheckDatabaseHealthUseCase
      ↓
DatabaseHealthCheckPort
      ↓
TypeORM persistence adapter
      ↓
entity / mapper / PostgreSQL
```

This reference demonstrates a service-owned vertical slice. It is not a requirement that every API capability or internal service mechanically contain every layer or file type.

The current application/domain placement for health is under the `system/health-check` area. Preserve that ownership unless a concrete requirement changes it; do not reorganize API code merely to make it resemble a business-service host such as Documents.

## Configuration

API configuration is the current proven reference for internal service configuration:

- `src/app/infrastructure/config/api-env.schema.ts`;
- `src/app/infrastructure/config/api.config.ts`;
- `src/app/infrastructure/config/api-config.module.ts`;
- `src/main.ts`.

Configuration changes MUST follow `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md`.

Do not introduce a second API configuration mechanism, project-local `.env` loading, or direct `process.env` access outside the documented configuration boundary.

## Persistence

API owns its PostgreSQL/TypeORM runtime boundary. Persistence changes MUST follow `docs/engineering/database-guidelines.md` and the nearest applicable persistence instructions.

Do not expose TypeORM entities/repositories/DataSource to application/domain or presentation code merely for convenience.

## Health reference specifics

The database health implementation is production functionality and canonical reference code for API health behavior.

The persistence probe demonstrates:

```text
create probe
    ↓
write
    ↓
read + validate
    ↓
cleanup
```

Cleanup is attempted after a successful write even when read/validation fails. Preserve this behavior unless a concrete requirement changes it.

Liveness remains independent of external infrastructure; readiness composes the database check through presentation/Terminus.

Future subsystem health checks should become sibling application behavior when required rather than adding external-system orchestration directly to the health controller.

## API E2E

`apps/api-e2e` owns real HTTP integration through the running API application. The existing health E2E is the canonical smoke reference.

Use API E2E to verify important running-service integration boundaries. It does not replace focused application, persistence, or presentation tests owned by lower boundaries.

## Verification

For API changes, run the relevant subset of the existing Nx targets:

```bash
pnpm nx run @accounterbro/api:lint
pnpm nx run @accounterbro/api:typecheck
pnpm nx run @accounterbro/api:test
pnpm nx run @accounterbro/api:build
```

When persistence behavior changes, include the relevant PostgreSQL-backed integration/migration verification. When HTTP behavior or end-to-end wiring changes, include the relevant API E2E target.

Do not declare API work complete while relevant API checks are known to fail.