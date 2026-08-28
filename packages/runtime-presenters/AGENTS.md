# Runtime Presenter Package Rules

These rules apply to `packages/runtime-presenters/` in addition to the root workspace rules and `packages/AGENTS.md`.

`@accounterbro/runtime-presenters` is a technical runtime package, not a business feature package. Keep the root entrypoint intentionally minimal; transport-specific behavior belongs in explicit subpath entrypoints such as `@accounterbro/runtime-presenters/http`.

Consumer-facing internal-service HTTP guidance is owned by `docs/engineering/http-presenter-guidelines.md`. This file owns only implementation-local invariants for changing the shared runtime-presenter package itself.

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
- treat semantic validity of the trusted actor type as part of the upstream contract rather than duplicating the EDP Actor factory/schema inside this transport adapter;
- use EDP/Core types for the resulting Actor and TenantReference values without introducing a runtime EDP factory dependency;
- reject missing, repeated/ambiguous, blank, or padded identity before controller invocation;
- write the resulting typed values to the request;
- remain independent from application/domain behavior, persistence, concrete UseCases, and Nest DI.

The middleware is a trusted-upstream adapter, not authentication or authorization. It MUST NOT parse credentials, verify tokens, call persistence, infer permissions, or claim caller authenticity. Production deployment must ensure the upstream auth/gateway boundary strips untrusted caller-supplied AccounterBro identity headers, validates the upstream identity contract, and injects trusted values.

`@Actor()` and `@Tenant()` remain extraction-only decorators. Do not move validation or authentication into them.

Tests in this package own request-identity transport behavior and should use plain request/header data. Service controller tests MUST NOT duplicate those cases; service E2E may send the canonical trusted headers to exercise the same production middleware path.

## HTTP health

`@accounterbro/runtime-presenters/http/health` owns the reusable Nest + Terminus adapter for internal-service liveness and readiness HTTP endpoints.

`HttpHealthModule.register(...)` is the canonical composition boundary. A consuming Nest service supplies an explicit factory for its `ReadinessCheck[]`; the shared package MUST NOT discover checks, maintain a registry, or depend on concrete service capabilities.

The adapter MUST:

- expose `health/live` and `health/ready` relative to the consuming application's global prefix;
- keep liveness independent from readiness checks;
- execute the explicitly supplied readiness checks and use each check's `name` as the Terminus indicator key;
- convert readiness failures to a down indicator without exposing the underlying error message;
- own the shared Terminus graceful-shutdown delay of 1,000 ms.

The consuming application remains responsible for its global prefix and for enabling Nest shutdown hooks. The health adapter MUST NOT set either one.

This subpath may depend on the transport-independent `@accounterbro/runtime-health` contract and Nest/Terminus only. It MUST NOT import `@accounterbro/runtime-health/typeorm`, TypeORM, service modules, business packages, EDP execution packages, or concrete readiness checks.

Tests here own the HTTP adapter behavior: route composition, liveness isolation, readiness success/failure mapping, stable indicator names, sensitive-error suppression, and graceful-shutdown response. Service tests should retain only integration evidence that the service supplies its own checks correctly.
