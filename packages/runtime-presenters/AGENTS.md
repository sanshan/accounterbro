# Runtime Presenter Package Rules

These rules apply to `packages/runtime-presenters/` in addition to the root workspace rules and `packages/AGENTS.md`.

`@accounterbro/runtime-presenters` is a technical runtime package, not a business feature package. Keep the root entrypoint intentionally minimal; transport-specific behavior belongs in explicit subpath entrypoints.

Consumer-facing internal-service HTTP guidance is owned by `docs/engineering/http-presenter-guidelines.md`. Cross-cutting observability/failure/retry ownership is recorded in `docs/engineering/observability-and-http-errors.md`. This file owns implementation-local invariants for the shared runtime-presenter package.

## HTTP request identity

`@accounterbro/runtime-presenters/http` owns the reusable Nest HTTP adapter that establishes typed presenter request identity before controllers run.

The canonical production path is:

```text
trusted upstream identity headers
    -> httpRequestIdentityMiddleware
    -> request.actor / request.tenant
    -> @Actor() / @Tenant()
    -> controller
```

The canonical trusted headers are defined only by `HTTP_REQUEST_IDENTITY_HEADERS`. Do not repeat raw header names in service code.

`httpRequestIdentityMiddleware` MUST:

- require exactly one non-blank canonical actor type, actor id, and tenant id header;
- treat semantic validity of the trusted actor type as part of the upstream contract rather than duplicating EDP Actor factories/schema;
- use EDP/Core types for Actor and TenantReference without introducing a runtime EDP factory dependency;
- reject missing, repeated/ambiguous, blank, or padded identity before controller invocation;
- write typed values to the request;
- remain independent from application/domain behavior, persistence, concrete UseCases, and Nest DI.

The middleware is a trusted-upstream adapter, not authentication or authorization. `@Actor()` and `@Tenant()` remain extraction-only decorators.

## HTTP errors

`@accounterbro/runtime-presenters/http/errors` is the framework-light public owner of canonical HTTP Problem Details definitions and mapping primitives. Keep it free from eager Nest filter composition so consumers that need only problem definitions do not load observability/EDP filter dependencies transitively.

`@accounterbro/runtime-presenters/http/errors/nest` is the explicit Nest integration entrypoint and owns `HttpErrorsModule` plus the global ordinary-error filter composition.

Canonical runtime rules:

- `HttpProblemDefinition` owns public `code`, `status`, `title`, and `type` once;
- `ExecutionFailureError` mapping is based only on `executionFailure.code`; never map by message or `retryable`;
- an expected presenter-selected problem uses `HttpProblemException`; this does not turn the underlying application result into an EDP failure;
- Nest `HttpException` status maps to the shared problem family;
- unknown thrown values become the safe internal problem and do not expose stack/cause/internal detail;
- the active OpenTelemetry `traceId` may be included as a safe problem reference when available;
- expected client/business problems are not terminal server-error logs;
- a non-expected terminal exception is logged with full diagnostics once at this consuming boundary.

Do not introduce another failure taxonomy, service-specific code table, or global classification of unknown infrastructure errors here.

## HTTP OpenAPI

`@accounterbro/runtime-presenters/http/openapi` owns the shared business/application endpoint error-documentation projection.

`@ApiEndpoint({ errors })` accepts canonical `HttpProblemDefinition` values and stores only internal endpoint-error metadata. `createOpenApiDocument(...)` MUST first use normal `SwaggerModule.createDocument(...)` behavior and then project those canonical problems into responses.

This preserves the proven invariants:

- runtime and OpenAPI use one canonical problem-definition source;
- error variants sharing one status are grouped under one OpenAPI response;
- successful status is not an `ApiEndpoint` option; Nest defaults or explicit `@HttpCode(...)` remain runtime truth;
- successful schemas remain on the standard Nest/Swagger path;
- controllers do not repeat status/title/type/schema literals in stacks of `Api*Response` decorators;
- generic internal errors are not mechanically repeated on every endpoint.

Do not move Swagger types into `/http/errors`. Runtime Problem Details and OpenAPI projection remain separate entrypoints with shared canonical definitions.

## HTTP health

`@accounterbro/runtime-presenters/http/health` owns the reusable Nest + Terminus adapter for internal-service liveness and readiness HTTP endpoints.

`HttpHealthModule.register(...)` is the canonical composition boundary. A consuming Nest service supplies an explicit factory for its `ReadinessCheck[]`; the shared package MUST NOT discover checks, maintain a registry, or depend on concrete service capabilities.

The adapter MUST:

- expose `health/live` and `health/ready` relative to the consuming application's global prefix;
- keep liveness independent from readiness checks;
- execute explicitly supplied readiness checks and use each check's `name` as the Terminus indicator key;
- convert readiness failures to a down indicator without exposing the underlying error message;
- own the shared Terminus graceful-shutdown delay of 1,000 ms.

Health is a separate system contract. The health controller/filter boundary MUST preserve Terminus responses even when `HttpErrorsModule` installs the global ordinary-error filter. Do not detect health by URL string inside the generic error filter, and do not require `@ApiEndpoint`/Problem Details declarations on health methods.

The consuming application remains responsible for its global prefix and shutdown hooks. The health subpath may depend on transport-independent `@accounterbro/runtime-health` and Nest/Terminus only; it MUST NOT import TypeORM, concrete services, business packages, or EDP execution packages.

## Testing ownership

Tests here own shared request-identity transport behavior, runtime Problem Details mapping/filter behavior, OpenAPI projection, and health HTTP adaptation.

Service tests keep only integration evidence that their own composition and public endpoint contract work. They MUST NOT duplicate lower-boundary mapping, EDP semantics, logging internals, or Terminus adapter behavior.
