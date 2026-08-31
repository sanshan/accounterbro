# Internal Service Agent Rules

These rules apply to internal services under `apps/services/` in addition to the root workspace rules.

Reusable service architecture, UseCase, runtime-consumption, dependency-direction, and testing rules are owned by `docs/engineering/service-guidelines.md`. Shared observability/failure ownership is recorded in `docs/engineering/observability-and-http-errors.md`. Read the applicable guide before designing or modifying service behavior.

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

## Shared observability and ordinary HTTP errors

When an internal service needs the common production logging/telemetry runtime, consume `@accounterbro/runtime-observability`; Nest lifecycle/composition lives under `/nest`. Do not create service-local Pino configuration, OpenTelemetry exporters, trace helpers, or EDP observer providers while the shared runtime owns them.

When an HTTP service needs ordinary RFC 9457 failure presentation, compose `HttpErrorsModule` from `@accounterbro/runtime-presenters/http/errors/nest`. Canonical Problem Details definitions/mappings remain under `/http/errors`; endpoint OpenAPI projection remains under `/http/openapi`.

`apps/services/documents` is the proven business-service reference for shared observability + EDP observer composition + ordinary HTTP errors + endpoint-specific `@ApiEndpoint(...)` while retaining separate Terminus health. Do not infer that every service requires Runner, Reader, or UseCaseExecutor: compose EDP execution only when the service actually hosts that behavior.

Services MUST NOT introduce local failure taxonomies, retry policies, exception filters, Problem Details DTOs, OpenAPI error tables, or observer adapters while the shared owners already provide those capabilities. Unknown infrastructure errors stay unclassified unless the concrete adapter knows their semantics.

## HTTP presenters and service E2E

When a service exposes `presenters/http` or adds its HTTP E2E project, MUST follow `docs/engineering/http-presenter-guidelines.md`.

The base internal-service generator remains transport-agnostic. `PresentersModule` is still part of the stable service shell; do not add HTTP bootstrap or E2E-specific serve configuration merely because the module exists.

For ordinary business/application endpoints, endpoint-specific public problems are declared through the shared `@ApiEndpoint(...)` contract using canonical definitions. Successful status remains owned by Nest defaults/`@HttpCode(...)`, and successful schemas remain on the standard Nest/Swagger path.

## Shared service health

When an internal HTTP service requires standard liveness/readiness endpoints, consume `@accounterbro/runtime-presenters/http/health`. Database readiness is provided by `@accounterbro/runtime-health/typeorm` using the service's existing Nest-managed `DataSource`; the service keeps ownership of database lifecycle and migration execution.

Compose health through the stable service shell. `PresentersModule` may configure the shared HTTP adapter using capabilities exported through `ApplicationModule`; it MUST NOT import `InfrastructureModule` directly. Use `apps/services/documents` as the proven internal-service consumer reference.

Request-identity middleware required by business controllers MUST remain scoped to those routes. Do not make standard health endpoints require Actor/Tenant identity merely because the same service has authenticated or identity-aware business presenters.

Health remains Terminus-owned. Do not convert health failures to Problem Details, route health through UseCaseExecutor, or add ordinary `@ApiEndpoint` error declarations merely for uniformity.

## Persistence and business-package integration

When a service owns PostgreSQL persistence or composes TypeORM persistence from hosted packages, MUST follow `docs/engineering/database-guidelines.md`.

When a service hosts a business package, follow `docs/engineering/package-guidelines.md` for the package's public integration contracts and `docs/engineering/service-guidelines.md` for the hosting-service boundary.

## Shared execution runtime

For service-side Runner, Reader, UseCaseExecutor, resolver, transaction, execution-log, Outbox, and durable UseCase execution consumption, follow `docs/engineering/service-guidelines.md` and, for TypeORM persistence composition, `docs/engineering/database-guidelines.md`.

The canonical business-service host registers package manifests through `@accounterbro/runtime-executions/nest`:

```ts
RuntimeExecutionsModule.register([documents]);
```

A service chooses the hosted package list and keeps ownership of its real `DataSource` lifecycle/configuration and service-specific external integrations. It MUST NOT recreate the standard execution/read/store provider graph with local tokens, provider wrapper files, or local execution/read modules. Ordinary runtime dependencies use the runtime-valued class/abstract-class identities from `@accounterbro/runtime-executions`; container/multibinding tokens are the explicit internal exception.

Retry ownership remains EDP-owned: Runner retry is Command-owned, Reader source retry is Query-owned, and UseCaseExecutor has no internal retry loop. A service MUST NOT add a common retry policy merely because shared telemetry observes retry events.

Implementation-local invariants for changing `@accounterbro/runtime-executions` itself remain in `packages/runtime-executions/AGENTS.md`; do not copy them into a service.

## Verification

Use the service's current Nx project configuration to select the smallest relevant lint, typecheck, test, build, migration, and E2E targets required by the change. Do not add service-specific verification commands by guessing project names from directory names.
