# Internal Service Agent Rules

These rules apply to internal services under `apps/services/` in addition to the root workspace rules.

Reusable service architecture, UseCase, runtime-consumption, dependency-direction, testing, observability, and HTTP-error rules are owned by `docs/engineering/service-guidelines.md`, `docs/engineering/observability-and-http-errors.md`, and `docs/engineering/http-presenter-guidelines.md`. Read the applicable guide before modifying service behavior.

Use `apps/services/documents` as the current proven business-service host reference. Reuse only the behavior required by the service being changed; do not copy Documents-specific behavior mechanically.

## Stable service shell

Every internal service keeps the stable Nest composition shell:

```text
PresentersModule -> ApplicationModule -> InfrastructureModule
```

The corresponding `presenters/`, `application/`, and `infrastructure/` boundaries remain present even when one currently has no providers or behavior. Do not remove or bypass one as empty-layer cleanup.

## Creation and identity

New internal services MUST be created with:

```bash
pnpm nx g @accounterbro/generators:service <name>
```

The canonical layout and identity are:

```text
apps/services/<name> -> @accounterbro/<name>-service
```

The service generator MUST preserve the stable service shell. MUST NOT create a new internal service with a lower-level Nx application generator directly.

## Configuration

When creating or changing internal service configuration, MUST follow:

- `docs/engineering/environment-guidelines.md` for raw environment ownership/loading/naming;
- `docs/engineering/service-configuration-guidelines.md` for typed Nest service configuration.

Use `apps/api` as the proven configuration reference. Do not introduce a parallel configuration or env-loading mechanism.

## Shared observability and HTTP failures

When an internal service needs common production logging/telemetry, consume `@accounterbro/runtime-observability`; Nest composition lives under `/nest`. Use structured Pino logging and the shared OpenTelemetry lifecycle rather than creating service-local logger, exporter, trace, or EDP-observer providers.

When an HTTP service needs ordinary RFC 9457 error presentation, compose `HttpErrorsModule` from `@accounterbro/runtime-presenters/http/errors/nest`. Canonical problem definitions/mapping primitives remain under `/http/errors`; endpoint OpenAPI projection remains under `/http/openapi`.

`apps/services/documents` is the proven business-service composition reference: it combines shared observability, shared EDP execution observers, ordinary HTTP errors, endpoint-specific `@ApiEndpoint(...)`, and separate Terminus health. Do not infer from that reference that every service requires Runner/Reader/UseCaseExecutor; consume execution runtime only when the service actually hosts business execution.

Services MUST NOT introduce local failure taxonomies, retry policies, exception filters, Problem Details DTOs, OpenAPI error tables, or observer providers while shared owners already provide those capabilities. Unknown infrastructure errors stay unclassified unless the concrete adapter knows their semantics.

## HTTP presenters and service E2E

When a service exposes `presenters/http` or adds its HTTP E2E project, MUST follow `docs/engineering/http-presenter-guidelines.md`.

The base internal-service generator remains transport-agnostic. `PresentersModule` is still part of the stable service shell; do not add HTTP bootstrap or E2E-specific serve configuration merely because the module exists.

For ordinary application endpoints, endpoint-specific public errors are declared with the shared `@ApiEndpoint(...)` contract and canonical problem definitions. Successful status remains owned by Nest defaults/`@HttpCode`; successful schemas remain standard Nest/Swagger behavior.

## Shared service health

When an internal HTTP service requires standard liveness/readiness endpoints, consume `@accounterbro/runtime-presenters/http/health`. Database readiness is provided by `@accounterbro/runtime-health/typeorm` using the service's existing Nest-managed `DataSource`; the service keeps ownership of database lifecycle and migration execution.

Compose health through the stable service shell. `PresentersModule` may configure the shared HTTP adapter using capabilities exported through `ApplicationModule`; it MUST NOT import `InfrastructureModule` directly. Use `apps/services/documents` as the proven internal-service consumer reference.

Request-identity middleware required by business controllers MUST remain scoped to those routes. Do not make standard health endpoints require Actor/Tenant identity merely because the same service has identity-aware business presenters.

Health remains a Terminus-owned system contract. Do not route it through UseCaseExecutor, convert its failures to Problem Details, or add ordinary `@ApiEndpoint` error declarations merely for uniformity.

## Persistence and business-package integration

When a service owns PostgreSQL persistence or composes TypeORM persistence from hosted packages, MUST follow `docs/engineering/database-guidelines.md`.

When a service hosts a business package, follow `docs/engineering/package-guidelines.md` for the package's public integration contracts and `docs/engineering/service-guidelines.md` for the hosting-service boundary.

## Shared execution runtime

For Runner, Reader, UseCaseExecutor, resolver, transaction, execution-log, Outbox, and durable UseCase execution consumption, follow `docs/engineering/service-guidelines.md` and `packages/runtime-executions/AGENTS.md`.

The canonical business-service host registers package manifests through `@accounterbro/runtime-executions/nest`:

```ts
RuntimeExecutionsModule.register([documents]);
```

A service chooses the hosted package list and keeps ownership of its real `DataSource` lifecycle/configuration and service-specific external integrations. It MUST NOT recreate the standard execution/read/store provider graph with local tokens, provider wrappers, or local execution/read modules.

Retry ownership remains EDP-owned: Runner uses Command retry options, Reader source retry uses Query options, and UseCaseExecutor has no internal retry loop. A service MUST NOT add a common retry policy merely because shared telemetry observes retry events.

Implementation-local invariants for `@accounterbro/runtime-executions` itself remain in `packages/runtime-executions/AGENTS.md`; do not copy them into a service.

## Verification

Use the service's current Nx project configuration to select the smallest relevant lint, typecheck, test, build, migration, and E2E targets required by the change. Do not add service-specific verification commands by guessing project names from directory names.
