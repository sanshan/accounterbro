# Runtime Presenter Package Rules

These rules apply to `packages/runtime-presenters/` in addition to the root workspace rules, `packages/AGENTS.md`, and `docs/engineering/package-guidelines.md`.

`@accounterbro/runtime-presenters` is a technical runtime package, not a business feature package. Keep the root entrypoint intentionally minimal; transport-specific behavior belongs in explicit subpath entrypoints such as `@accounterbro/runtime-presenters/http`.

## HTTP request identity

`@accounterbro/runtime-presenters/http` owns the reusable Nest HTTP adapter that establishes typed presenter request identity before controllers run.

The canonical production path is:

```text
trusted upstream identity headers
    -> HttpRequestIdentityMiddleware
    -> request.actor / request.tenant
    -> @Actor() / @Tenant()
    -> controller
```

The canonical trusted headers are defined only by `HTTP_REQUEST_IDENTITY_HEADERS`. Do not repeat raw header names in service code.

`HttpRequestIdentityMiddleware` MUST:

- require exactly one non-blank canonical actor type, actor id, and tenant id header;
- treat semantic validity of the trusted actor type as part of the upstream contract rather than duplicating the EDP Actor factory/schema inside this transport adapter;
- use EDP/Core types for the resulting Actor and TenantReference values without introducing a runtime EDP factory dependency;
- reject missing, repeated/ambiguous, blank, or padded identity before controller invocation;
- write the resulting typed values to the request;
- remain independent from application/domain behavior, persistence, and concrete UseCases.

The middleware is a trusted-upstream adapter, not authentication or authorization. It MUST NOT parse credentials, verify tokens, call persistence, infer permissions, or claim caller authenticity. Production deployment must ensure the upstream auth/gateway boundary strips untrusted caller-supplied AccounterBro identity headers, validates the upstream identity contract, and injects trusted values.

`@Actor()` and `@Tenant()` remain extraction-only decorators. Do not move validation or authentication into them.

Tests in this package own request-identity transport behavior and should use plain request/header data. Service controller tests MUST NOT duplicate those cases; service E2E may send the canonical trusted headers to exercise the same production middleware path.
