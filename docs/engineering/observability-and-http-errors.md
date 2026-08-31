# Observability, Failure, and HTTP Error Engineering Guidelines

These rules record the canonical service-wide observability and failure-presentation flow proven by `apps/services/documents` and `apps/api`.

Use the owner closest to the responsibility. Do not rebuild the same policy in a service.

## Canonical owners

- EDP owns `ExecutionFailure`, `ExecutionFailureError`, Runner, Reader, UseCaseExecutor, and their retry/observation semantics.
- `@accounterbro/runtime-executions` owns AccounterBro composition around those published EDP contracts; its Nest entrypoint is `@accounterbro/runtime-executions/nest`.
- `@accounterbro/runtime-observability` owns structured logging policy, OpenTelemetry SDK composition, trace-log correlation, and EDP-observer adaptation; Nest lifecycle composition lives under `/nest`.
- `@accounterbro/runtime-presenters/http/errors` owns canonical Problem Details definitions and runtime mapping primitives. It intentionally remains usable without Nest filter composition.
- `@accounterbro/runtime-presenters/http/errors/nest` owns the Nest global ordinary-error filter composition.
- `@accounterbro/runtime-presenters/http/openapi` owns `@ApiEndpoint(...)` and `createOpenApiDocument(...)` for projecting canonical public problems into OpenAPI.
- `@accounterbro/runtime-presenters/http/health` owns the separate Nest/Terminus health contract.

`apps/services/documents` is the business-service consumer reference. `apps/api` proves that the shared Pino/OpenTelemetry/HTTP-error runtime does not require Runner, Reader, or UseCaseExecutor when the service has no hosted business execution pipeline.

## Runtime topology

Production logs are structured Pino output to stdout/stderr for external collection. Request execution MUST NOT synchronously deliver logs to a remote backend.

OpenTelemetry uses OTLP exporters compatible with an OpenTelemetry Collector. Traces use batched export and push metrics use periodic export. Exporter or observer failures MUST NOT alter execution semantics.

The runtime topology is therefore:

```text
service
  ├─ structured Pino stdout/stderr -> external log collection
  └─ OpenTelemetry SDK
       ├─ batched traces ─┐
       └─ periodic metrics ─> OTLP / OpenTelemetry Collector
```

Do not select a concrete telemetry backend or SLO policy in the shared runtime unless a separate requirement owns that decision.

## Failure classification and adapter ownership

`ExecutionFailure` / `ExecutionFailureError` are the only classified execution-failure model.

A handler or infrastructure adapter may create an `ExecutionFailureError` only when that boundary knows the semantics of the concrete failure it is classifying. Preserve the original failure as `cause` where useful. Unknown PostgreSQL, TypeORM, network, storage, or arbitrary thrown errors remain unknown; shared composition MUST NOT infer a code or retryability globally.

Do not introduce an AccounterBro `classification`, retry scope, parallel error hierarchy, or message-based classifier.

## Retry ownership

Retry is owned by the EDP request/boundary that actually performs it:

- Runner retries only when the `Command` carries `Command.options.retry` and the classified failure is retryable according to EDP semantics.
- Reader source retry is Query-owned through `QueryOptions.retry`; shared runtime does not broaden that policy around cache/coordinator behavior.
- UseCaseExecutor has no internal retry loop or retry configuration.

Observability follows the same ownership. Runner `attempt.*` / `retry.scheduled` observations describe Runner retries; Reader `read.attempt.*` / `read.retry.scheduled` observations describe Reader source retries. Do not synthesize retry events in UseCaseExecutor or infer them in the observability adapter.

## Logging and telemetry safety

Automatic HTTP access/error logging is disabled in the shared Nest/Pino adapter. Request/response bodies, uploaded-file bytes, authorization/cookie values, trusted actor/tenant headers, passwords, tokens, API keys, and secrets are deny-by-default and centrally redacted as defense in depth.

A terminal thrown exception is logged with full diagnostics once at the boundary that consumes the occurrence. Lower layers do not catch-log-rethrow the same exception. EDP lifecycle observations are telemetry facts, not a second place to copy stack/cause/message payloads.

Metric dimensions MUST remain bounded. Intent IDs, correlation IDs, tenant IDs, attempt identities, actor/entity/cache identities, messages, and stacks do not belong in metric labels. Operation/read names, lifecycle event names, bounded outcomes/scopes/reasons, and retryable booleans are acceptable where the current adapter exposes them.

OpenTelemetry `traceId` and EDP `correlationId` are distinct identities. Keep both where available; never substitute one for the other. High-cardinality correlation values belong in logs/traces, not metrics.

## Canonical HTTP failure flow

Ordinary HTTP failures are presented as RFC 9457-compatible `application/problem+json` using the shared Problem Details contract.

The flow is:

```text
classified ExecutionFailureError
    -> explicit mapping by executionFailure.code
    -> canonical HttpProblemDefinition

expected application/business result rejected by HTTP contract
    -> presenter explicitly selects canonical HttpProblemDefinition
    -> HttpProblemException

Nest HttpException
    -> canonical status mapping

unknown thrown value
    -> safe internal problem
```

HTTP mapping MUST NOT inspect an execution failure message or `retryable` to decide status. HTTP status is an HTTP-boundary concern. An unknown problem must not expose internal diagnostics. A problem may expose the active OpenTelemetry `traceId` as a safe support reference when one exists.

Expected application results remain normal results below the presenter. For example, Documents Get returns its application-level not-found result normally; the HTTP controller decides that the public HTTP contract is the canonical not-found problem. Do not throw an EDP failure merely to represent such a result.

## Runtime Problem Details and OpenAPI

Canonical `HttpProblemDefinition` values are the single source for public problem `code`, `status`, `title`, and `type`. Runtime presentation and OpenAPI projection must reuse those same definitions.

Business/application controller methods declare endpoint-specific public errors with one compact decorator:

```ts
@ApiEndpoint({ errors: [NOT_FOUND_HTTP_PROBLEM] })
```

Controllers MUST NOT repeat status/title/type/schema literals already owned by the canonical problem definition. `@ApiEndpoint` does not own successful status codes: Nest defaults and an explicit `@HttpCode(...)` remain runtime truth. Successful schemas remain on the standard Nest/Swagger path.

`createOpenApiDocument(...)` first builds the normal Nest/Swagger document and then projects `@ApiEndpoint` errors. Error definitions sharing one status are grouped into one response. Do not replace this with response-decorator stacks that suppress or duplicate Nest's successful response metadata.

Generic internal errors do not need to be repeated on every endpoint. Do not infer endpoint business errors from the exception filter or call graph.

## Health remains a separate contract

Shared health is owned by `@accounterbro/runtime-presenters/http/health` and Terminus. It is not converted to Problem Details and does not use ordinary `@ApiEndpoint` declarations merely for visual uniformity.

The generic HTTP error filter MUST NOT detect health using URL strings. Health preserves its own controller/filter ownership so Terminus response semantics remain independent from ordinary application error presentation.

## Verification ownership

Package tests own shared logger, telemetry, EDP-observer, Problem Details, filter, OpenAPI-projection, and health semantics. Service tests add only service-owned integration evidence.

Current cross-service evidence is intentionally small:

- Documents E2E proves business not-found plus Nest binding/upload failures use the canonical ordinary Problem Details envelope while health remains Terminus-owned.
- API E2E proves an ordinary framework 404 uses the same Problem Details envelope while `/api/health/live` and `/api/health/ready` retain Terminus semantics.
- both services accept a safe `traceId` reference when active and reject stack/cause leakage.

Do not add artificial production failure endpoints or duplicate package-level error/telemetry semantics in service E2E.
