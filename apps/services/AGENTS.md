# Internal Service Agent Rules

These rules apply to internal services under `apps/services/` in addition to the root workspace rules.

Reusable service architecture, UseCase, runtime-consumption, dependency-direction, and testing rules are owned by `docs/engineering/service-guidelines.md`. Read that guide before designing or modifying service application behavior.

Use `apps/services/documents` as the current proven business-service host reference. Reuse only the behavior required by the service being changed; do not copy Documents-specific behavior mechanically.

## Stable service shell

Every internal service keeps the stable Nest composition shell defined in `docs/engineering/service-guidelines.md`:

```text
PresentersModule -> ApplicationModule -> InfrastructureModule
```

The corresponding `presenters/`, `application/`, and `infrastructure/` boundaries remain present even when one currently has no providers or behavior. Do not remove or bypass one of these modules as empty-layer cleanup.

## Creation and identity

New internal services MUST be created with:

```bash
pnpm nx g @accounterbro/generators:service <name>
```

The canonical layout and identity convention is:

```text
apps/services/<name> -> @accounterbro/<name>-service
```

The service generator MUST preserve the stable service shell above. MUST NOT create a new internal service by invoking `@nx/nest:application`, `@nx/node:application`, or another low-level application generator directly. The repository generator owns normalization to the proven non-bundled service shell.

## Configuration

When creating or changing internal service configuration, MUST follow:

- `docs/engineering/environment-guidelines.md` for raw environment ownership/loading/naming;
- `docs/engineering/service-configuration-guidelines.md` for typed Nest service configuration.

Use `apps/api` as the proven configuration reference. Do not introduce a parallel configuration or env-loading mechanism.

## HTTP presenters and service E2E

When a service exposes `presenters/http` or adds its HTTP E2E project, MUST follow `docs/engineering/http-presenter-guidelines.md`.

The base internal-service generator remains transport-agnostic. `PresentersModule` is still part of the stable service shell; do not add HTTP bootstrap or E2E-specific serve configuration merely because the module exists.

## Shared service health

When an internal HTTP service requires standard liveness/readiness endpoints, consume `@accounterbro/runtime-presenters/http/health`. Database readiness is provided by `@accounterbro/runtime-health/typeorm` using the service's existing Nest-managed `DataSource`; the service keeps ownership of database lifecycle and migration execution.

Compose health through the stable service shell. `PresentersModule` may configure the shared HTTP adapter using capabilities exported through `ApplicationModule`; it MUST NOT import `InfrastructureModule` directly. Use `apps/services/documents` as the proven internal-service consumer reference.

Request-identity middleware required by business controllers MUST remain scoped to those routes. Do not make standard health endpoints require Actor/Tenant identity merely because the same service has authenticated or identity-aware business presenters.

## Persistence and business-package integration

When a service owns PostgreSQL persistence or composes TypeORM persistence from hosted packages, MUST follow `docs/engineering/database-guidelines.md`.

When a service hosts a business package, follow `docs/engineering/package-guidelines.md` for the package's public integration contracts and `docs/engineering/service-guidelines.md` for the hosting-service boundary.

## Shared execution runtime

For service-side Runner, Reader, UseCaseExecutor, resolver, transaction, execution-log, Outbox, and durable UseCase execution consumption, follow `docs/engineering/service-guidelines.md` and, for TypeORM persistence composition, `docs/engineering/database-guidelines.md`.

Implementation-local invariants for changing `@accounterbro/runtime-executions` itself remain in `packages/runtime-executions/AGENTS.md`; do not copy them into a service.

## Verification

Use the service's current Nx project configuration to select the smallest relevant lint, typecheck, test, build, migration, and E2E targets required by the change. Do not add service-specific verification commands by guessing project names from directory names.
