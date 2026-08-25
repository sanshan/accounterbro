# HTTP Presenter Agent Rules

These rules apply to `apps/services/documents/src/app/presenters/http/` in addition to the root workspace rules and `apps/services/AGENTS.md`.

Use `apps/api/src/app/presenters/http/health` as the proven HTTP presentation reference for dependency direction, thin controllers, colocated presentation tests, and transport-only adapters. It is a reference, not a template that every feature must copy mechanically.

## Responsibility and dependency direction

HTTP presenters own transport concerns only:

```text
HTTP request
    ↓
controller / HTTP presenter
    ↓
service-wide UseCaseExecutor + concrete UseCase
    ↓
application behavior
```

Presenters MAY depend on concrete service UseCases and application-facing result/input types required to invoke them.

Presenters MUST NOT:

- call Runner, Reader, Operation/Read handlers, repositories, TypeORM, ObjectStorage, or other persistence/infrastructure boundaries directly when the UseCase owns that orchestration;
- move business rules or application orchestration into controllers, DTOs, or mappers;
- pass Nest, Express, Multer, request, or DTO types into application/UseCase code;
- return application/domain/UseCase result objects directly as HTTP contracts.

Controllers MUST remain thin adapters.

## Placement

Organize HTTP presentation by feature/capability under:

```text
presenters/http/<feature>/
```

Use the smallest structure required by the feature. For a normal business HTTP feature, the canonical shape is:

```text
presenters/http/<feature>/
├── <feature>.controller.ts
├── <feature>.controller.spec.ts
├── dto/
│   ├── <action>.request.dto.ts
│   └── <action>.response.dto.ts
└── mappers/
    └── <action>.response.mapper.ts
```

Do not create empty symmetry-only folders or generic base controllers/mappers. Add only files required by concrete endpoints.

Keep presenter-owned Nest module/composition wiring at the nearest presenter module boundary established by the service. Do not put HTTP composition into application or infrastructure modules.

## Controllers and UseCases

Concrete service UseCases are Nest `@Injectable()` providers and MUST be obtained through constructor DI. Controllers MUST NOT instantiate UseCases, reconstruct their stable dependencies, or manually resolve them from the Nest container.

Production HTTP invocation of durable UseCases MUST preserve the service execution boundary from `apps/services/AGENTS.md`: invoke the concrete UseCase through the service-wide EDP `UseCaseExecutor`; do not call `useCase.execute()` directly merely because the UseCase is injectable.

The controller therefore owns only transport adaptation and invocation assembly:

1. extract and validate transport input;
2. obtain request identity/context values through the shared HTTP runtime utilities;
3. construct the concrete UseCase input and typed UseCase context;
4. submit the concrete UseCase through `UseCaseExecutor`;
5. map the resulting application/UseCase result to a response DTO.

Invocation-specific metadata MUST remain explicit. Do not introduce request-scoped UseCases, AsyncLocalStorage, current-user/current-tenant providers, or other ambient state to avoid constructing the typed UseCase context.

## Actor and tenant

Use the shared HTTP presenter runtime entrypoint:

```ts
import {
    Actor,
    httpRequestIdentityMiddleware,
    Tenant,
} from '@accounterbro/runtime-presenters/http';
```

The presenter module MUST apply `httpRequestIdentityMiddleware` to routes whose controllers use `@Actor()` / `@Tenant()`. The middleware establishes typed request identity before controller invocation; controllers MUST NOT parse identity headers themselves.

The canonical trusted-upstream headers are exported through `HTTP_REQUEST_IDENTITY_HEADERS` and currently resolve to:

```text
x-accounterbro-actor-type
x-accounterbro-actor-id
x-accounterbro-tenant-id
```

This is a trusted-upstream contract, not authentication. A production gateway/auth boundary is responsible for authenticating the caller, stripping caller-supplied AccounterBro identity headers, validating the upstream identity contract, and injecting trusted values before forwarding to the internal service. Direct exposure of these internal routes to untrusted callers violates the contract.

The middleware requires one non-blank value for each canonical identity header and passes those trusted scalar values into typed `Actor` / `TenantReference` request fields. It intentionally does not invoke an EDP Actor runtime factory or duplicate EDP Actor semantic validation at this transport boundary. Missing, repeated/ambiguous, blank, or padded identity is rejected with `401` before controller invocation.

Use separate parameter decorators in controllers:

```ts
@Actor() actor: Actor
@Tenant() tenant: TenantReference
```

The shared decorators only read the typed values already established by the middleware.

Pass only the identity values required by the concrete UseCase context. A UseCase that needs `actor` but not `tenant` MUST NOT receive tenant merely because it is available on the HTTP request.

UseCases MUST remain unaware of HTTP request objects, trusted identity headers, middleware, and presenter decorators.

## DTO ownership

DTOs are HTTP contracts and belong inside `presenters/http`.

Request DTOs own HTTP-visible request shape and transport validation. They MUST NOT be imported into application/domain code or used as UseCase input types merely for convenience.

Response DTOs own HTTP-visible response shape. Controllers MUST NOT expose application/domain/UseCase result objects directly.

If an endpoint has no structured body/query contract, do not create a request DTO just for symmetry.

Use standard Nest validation/binding primitives when they already express the transport rule. Do not add a custom validator or abstraction when Nest owns the behavior.

### Uploaded files

For a normal single multipart upload, use Nest's standard file primitives such as `FileInterceptor`, `@UploadedFile`, and `ParseFilePipe` / `ParseFilePipeBuilder`.

Use Nest's built-in file validators such as `MaxFileSizeValidator` for file-size validation. Do not implement uploaded-file size as a `class-validator` decorator while the Nest file validator covers the requirement.

When an application input already accepts `Uint8Array`, an in-memory Multer `Buffer` can be passed as `file.buffer` without copying solely to convert it. Keep `Express.Multer.File` and other Multer metadata inside the HTTP boundary unless a concrete application requirement needs that metadata.

## Response mappers

Every application/UseCase result exposed over HTTP MUST have an explicit presenter mapping step to its response DTO.

Place feature-specific response mappers under:

```text
presenters/http/<feature>/mappers/
```

A presenter mapper MAY select, rename, flatten, or format values for the HTTP contract. It MUST NOT implement business decisions, persistence translation, authorization, or application orchestration.

Do not introduce generic mapper interfaces/base classes unless repeated implemented endpoints prove a concrete need.

## Presentation tests

Controller/presenter tests own only behavior introduced by the HTTP boundary. Use mocked/stubbed concrete UseCases and runtime collaborators rather than exercising persistence or EDP internals through controller tests.

Test, when applicable:

- transport input is translated into the exact expected UseCase input;
- actor/tenant and other presenter-owned invocation metadata are placed into the expected concrete UseCase context;
- the intended concrete UseCase is submitted through `UseCaseExecutor` once for a valid invocation;
- the UseCase result is mapped to the expected response DTO;
- material Nest-owned endpoint binding/validation behavior that is part of the HTTP contract.

MUST NOT duplicate:

- UseCase specification behavior;
- Runner/Reader/UseCaseExecutor semantics;
- Operation/Read handler behavior;
- persistence, transaction, recovery, idempotency/deduplication, or ObjectStorage behavior.

UseCase specs remain the authority for business behavior. Presenter tests prove the HTTP adapter contract. Request-identity middleware behavior is owned by `@accounterbro/runtime-presenters/http`; presenter/controller tests MUST NOT duplicate its parsing/validation cases.

## Current omissions

This guidance intentionally does not define:

- error response contracts beyond the established request-identity `401` boundary;
- HTTP exception filters;
- gateway/authentication implementation behind the trusted-upstream contract;
- authorization policy;
- messaging presenters.

Add those rules only after a concrete requirement establishes a proven implementation pattern.
