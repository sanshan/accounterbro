# HTTP Presenter Engineering Guidelines

These rules define the reusable HTTP presentation boundary for internal Nest services in AccounterBro.

Apply them when a service exposes `presenters/http`. They complement `docs/engineering/service-guidelines.md` and `docs/engineering/observability-and-http-errors.md`; they do not make HTTP mandatory for every internal service.

## Canonical implemented references

Use the closest proven implementation for the responsibility being changed:

- `apps/services/documents/src/app/presenters/http/documents` is the business HTTP presenter reference for concrete UseCase invocation, request identity, file upload, DTO mapping, expected-result-to-HTTP-error presentation, `@ApiEndpoint(...)`, and controller tests.
- `@accounterbro/runtime-presenters/http` owns reusable HTTP request-identity middleware and decorators.
- `@accounterbro/runtime-presenters/http/errors` owns canonical Problem Details definitions/runtime mapping primitives; `/http/errors/nest` owns Nest global error-filter composition.
- `@accounterbro/runtime-presenters/http/openapi` owns compact endpoint error declarations and canonical OpenAPI projection.
- `@accounterbro/runtime-presenters/http/health` owns reusable Nest/Terminus liveness and readiness adaptation.
- `apps/api` and `apps/services/documents` are the proven running-service consumers of shared observability, ordinary HTTP errors, and health. API preserves its global `/api` prefix; Documents exposes relative routes directly.

These references demonstrate ownership and dependency direction. They are not templates requiring every endpoint or service to consume every capability.

## HTTP service runtime

Adding a `presenters/http` boundary makes the hosting service an HTTP server process. The service must have a complete runnable HTTP bootstrap rather than remain an application-context-only Nest process.

A service with HTTP presenters MUST:

- create the Nest application with `NestFactory.create(...)`;
- expose its listen port through canonical typed service configuration;
- obtain namespaced service config through its existing `registerAs` `KEY` / `ConfigType` contract;
- call `app.listen(config.port)`;
- preserve shutdown hooks and lifecycle behavior already owned by the service.

When the service consumes the shared runtime observability module, use its exported Nest logger for Nest logging and structured startup logging rather than reintroducing default string-only startup logs. The complete logging/telemetry/error ownership is defined in `docs/engineering/observability-and-http-errors.md`.

The base internal-service generator remains transport-agnostic. Do not add an HTTP listener to every generated service merely because some services expose HTTP presenters.

## Responsibility and dependency direction

HTTP presenters own transport concerns only:

```text
HTTP request
    ↓
controller / HTTP presenter
    ↓
application-facing boundary
    ↓
application behavior
```

Presenters MAY depend on concrete service UseCases and application-facing input/result types needed to invoke them.

Presenters MUST NOT:

- call Runner, Reader, Operation/Read handlers, repositories, TypeORM, ObjectStorage, or other infrastructure boundaries directly when a UseCase owns that orchestration;
- move business rules or application orchestration into controllers, DTOs, mappers, or HTTP error definitions;
- pass Nest, Express, Multer, request, or DTO types into application/UseCase code;
- expose application/domain/UseCase result objects directly as HTTP response contracts merely for convenience.

Controllers remain thin transport adapters.

System health endpoints are technical runtime behavior rather than durable business UseCases. Consume `@accounterbro/runtime-presenters/http/health` and supply transport-independent `ReadinessCheck` instances from `@accounterbro/runtime-health`. Do not force `UseCaseExecutor` into health endpoints.

## Placement

Organize HTTP presentation by feature/capability under:

```text
presenters/http/<feature>/
```

Use the smallest structure required by the feature. A normal business HTTP feature may contain its controller, focused controller spec, HTTP DTOs, and response mappers. Do not create empty symmetry-only directories or generic base controllers/mappers.

Keep presenter-owned Nest composition at the nearest presenter module boundary. Do not put HTTP composition into application or infrastructure modules.

## Business controllers and durable UseCases

Concrete service UseCases are Nest providers and MUST be obtained through constructor DI. Controllers MUST NOT instantiate UseCases, reconstruct their dependencies, or manually resolve them from the Nest container.

When an HTTP business endpoint invokes a durable concrete UseCase, submit that UseCase through the service-wide EDP `UseCaseExecutor`; do not call `useCase.execute()` directly merely because the UseCase is injectable.

The controller owns transport adaptation and invocation assembly:

1. extract and validate transport input;
2. obtain required request identity/context values through shared HTTP utilities;
3. construct the concrete UseCase input and typed context;
4. submit through `UseCaseExecutor`;
5. select the public HTTP outcome and map successful results to response DTOs.

Invocation metadata remains explicit. Do not introduce request-scoped UseCases, ambient current-user/current-tenant providers, presenter-local AsyncLocalStorage, or similar hidden state.

## Actor and tenant request identity

Use `@accounterbro/runtime-presenters/http` for request identity. The package owns parsing/validation and the canonical header contract; service code MUST NOT reproduce raw identity-header names or parse them independently.

A presenter module whose controllers use `@Actor()` or `@Tenant()` MUST apply `httpRequestIdentityMiddleware` to those business routes before controller invocation.

Scope request-identity middleware to routes that require it. Shared health routes do not acquire Actor/Tenant requirements merely because another controller uses request identity.

The middleware/decorators represent a trusted-upstream identity contract, not authentication or authorization. Production exposure requires an upstream boundary that authenticates callers, strips untrusted caller-supplied AccounterBro identity headers, validates the upstream contract, and injects trusted values.

Controllers pass only identity values required by the concrete application context. UseCases remain unaware of HTTP request objects, trusted headers, middleware, and presenter decorators.

## DTO ownership and transport validation

DTOs are HTTP contracts and stay inside the HTTP presenter boundary.

Request DTOs own HTTP-visible request shape and transport validation. They MUST NOT be imported into application/domain code or reused as UseCase input types merely for convenience.

Response DTOs own the HTTP-visible successful response shape. Controllers MUST NOT expose application/domain/UseCase result objects directly when an explicit HTTP contract is required.

Use standard Nest validation/binding primitives when they already express the transport rule. Do not add a custom validator or abstraction when Nest owns the behavior.

### Uploaded files

For a normal single multipart upload, use Nest's standard file primitives such as `FileInterceptor`, `@UploadedFile`, and `ParseFilePipe` / `ParseFilePipeBuilder`.

Use built-in file validators such as `MaxFileSizeValidator` when required. When application input already accepts `Uint8Array`, an in-memory Multer `Buffer` may be passed as `file.buffer` without copying solely for conversion. Keep `Express.Multer.File` metadata inside the HTTP boundary unless a concrete application requirement needs it.

## Successful response mapping

Every application/UseCase result exposed as a successful business HTTP response MUST have an explicit presenter mapping step to its response contract.

A presenter mapper may select, rename, flatten, or format values. It MUST NOT implement business decisions, persistence translation, authorization, or application orchestration.

Do not introduce generic mapper interfaces/base classes until repeated implemented endpoints prove a concrete need.

## Ordinary HTTP error contract

Ordinary application/framework failures use the canonical RFC 9457-compatible `application/problem+json` contract from `@accounterbro/runtime-presenters/http/errors` and Nest composition from `/http/errors/nest`.

The runtime error flow and failure/retry ownership are defined in `docs/engineering/observability-and-http-errors.md`. At the presenter boundary:

- a classified `ExecutionFailureError` is mapped by `executionFailure.code` only;
- an expected application/business result remains a normal result below the presenter and is explicitly converted by the presenter to the appropriate canonical `HttpProblemDefinition` when the public HTTP contract is non-2xx;
- ordinary Nest `HttpException` status is mapped to the canonical problem family;
- unknown thrown values become the safe internal problem and do not expose diagnostics.

Do not create service-local Problem Details DTOs, exception filters, failure-code tables, or retryability-to-status mappings while the shared runtime owns them. HTTP status MUST NOT be inferred from `retryable` or error-message text.

Expected business/client problems are not automatically server-error logs. Terminal exception diagnostics follow the shared log-once policy.

## OpenAPI endpoint contracts

For ordinary business/application endpoints with endpoint-specific public errors, use one compact declaration from `@accounterbro/runtime-presenters/http/openapi`:

```ts
@ApiEndpoint({ errors: [NOT_FOUND_HTTP_PROBLEM] })
```

The supplied values are canonical `HttpProblemDefinition`s. Controllers MUST NOT repeat their status/title/type/schema literals with `@ApiNotFoundResponse`, `@ApiConflictResponse`, or similar stacks.

`@ApiEndpoint` owns only endpoint-specific public error projection. It MUST NOT:

- own or duplicate successful status configuration;
- replace HTTP verb decorators or `@HttpCode(...)`;
- infer errors from the exception filter or call graph;
- require generic internal errors to be listed on every endpoint;
- replace the normal Nest/Swagger successful schema path.

Nest defaults and explicit `@HttpCode(...)` remain runtime truth for success statuses. Build the document through `createOpenApiDocument(...)` so native Nest/Swagger success metadata is preserved and canonical endpoint errors are projected afterward. Error variants sharing one HTTP status are represented under one response.

Business packages remain independent of Swagger; these declarations belong at the HTTP presenter boundary.

## Health is not an ordinary application error contract

Health remains owned by `@accounterbro/runtime-presenters/http/health` and Terminus. Do not add ordinary `@ApiEndpoint`/Problem Details declarations to health methods merely for uniformity, and do not convert health failures into RFC 9457 responses.

The generic ordinary-error filter MUST NOT special-case `/health` path strings. The shared health controller owns its own filter boundary so Terminus semantics remain intact even when the global ordinary-error filter is installed.

## Presentation tests

Controller/presenter tests own only behavior introduced by the HTTP boundary. Use mocked/stubbed application/runtime collaborators rather than exercising persistence or EDP internals through controller tests.

For business UseCase endpoints, test when applicable that:

- transport input becomes the exact expected UseCase input;
- actor/tenant metadata enters the expected concrete UseCase context;
- the intended UseCase is submitted through `UseCaseExecutor` once;
- successful application results are mapped to the expected HTTP response;
- a material expected application result is selected as the intended canonical HTTP problem;
- generated OpenAPI for representative endpoints reflects declared canonical errors and the real Nest success status without duplicated success configuration.

Presenter tests MUST NOT duplicate UseCase specs, Runner/Reader/UseCaseExecutor semantics, handlers, persistence, request-identity parsing, shared Problem Details mapping, or shared health behavior.

## HTTP service E2E

Create an internal HTTP-service E2E project with:

```bash
pnpm nx g @accounterbro/generators:service-e2e <name>
```

The service MUST already satisfy the HTTP runtime contract before adding its E2E harness. Use the current project targets rather than inventing verification commands.

Use `apps/api-e2e` as the global-prefix reference and `apps/services/documents-e2e` as the business-service HTTP reference. E2E owns running-service integration evidence only. Current proven evidence includes:

- API ordinary unknown-route failures use the shared Problem Details envelope while `/api/health/*` stays Terminus-owned;
- Documents business not-found and Nest binding/upload failures use the same ordinary Problem Details conventions while `/health/*` stays Terminus-owned;
- safe active `traceId` references may be exposed, while stack/cause/internal diagnostics are not.

Do not add artificial production failure endpoints or duplicate lower-boundary package tests.

## Current omissions

This guidance still intentionally leaves unimplemented transport concerns outside the proven shared boundary, including:

- gateway/authentication implementation behind the trusted-upstream identity contract;
- authorization policy;
- non-HTTP presenters.

Add reusable rules for those concerns only after a concrete requirement and proven implementation establish them.
