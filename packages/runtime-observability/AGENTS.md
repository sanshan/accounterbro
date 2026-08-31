# Runtime Observability Agent Rules

These rules apply to `@accounterbro/runtime-observability` in addition to root and `packages/AGENTS.md`.

## Responsibility

`@accounterbro/runtime-observability` owns reusable service logging and observability composition for AccounterBro runtime hosts.

The root entrypoint owns framework-agnostic structured logging policy and diagnostics. Nest-specific composition lives under `@accounterbro/runtime-observability/nest`.

Pino is the canonical production logger. Production output is structured stdout/stderr suitable for external collection; this package MUST NOT synchronously deliver logs to a remote backend on request execution paths.

## Error diagnostics

EDP `ExecutionFailureError` remains the canonical classified execution failure. Logging MUST preserve its `executionFailure.code`, `executionFailure.retryable`, message, stack, and safe cause chain without defining another failure taxonomy.

Unknown `Error` instances remain ordinary diagnostic errors and MUST NOT be assigned an EDP failure code or retryability. Non-Error thrown/cause values MUST NOT cause arbitrary application objects to be serialized into logs.

A terminal thrown exception is logged with full diagnostics once at the boundary that consumes the occurrence. Lower layers MUST NOT catch-log-rethrow the same exception. Expected business/client outcomes are not server errors merely because an HTTP adapter may later present them as non-2xx responses.

## Sensitive data

Logging is deny-by-default for request payloads and identity/security data:

- automatic HTTP request/response logging is disabled by the shared Nest adapter;
- request/response bodies and uploaded file bytes MUST NOT be logged by default;
- authorization values, cookies, passwords, tokens, API keys, secrets, and trusted AccounterBro actor/tenant headers MUST NOT appear in logs;
- shared serializers expose only bounded HTTP metadata when a request/response object is explicitly logged;
- arbitrary DTOs or persistence/application objects MUST NOT be logged merely for convenience.

Keep central Pino redaction enabled as defense in depth even when a serializer already omits sensitive fields.

## OpenTelemetry correlation

This package may read the stable `@opentelemetry/api` active span to attach `traceId` and `spanId` to log records. It MUST NOT initialize an OpenTelemetry SDK, exporters, processors, instrumentation, spans, metrics, or EDP observer bridges here; those are separate observability responsibilities.

## Nest adapter

`@accounterbro/runtime-observability/nest` owns the smallest common Nest/Pino composition around `nestjs-pino`.

- services register the shared module once with service identity and optional version/environment metadata;
- `pino-http` request context may be used, but automatic HTTP access/error logging remains disabled to avoid duplicate terminal exception records and accidental request payload/header exposure;
- service application/bootstrap code may select the exported Nest logger as the Nest application logger;
- business/domain packages and concrete UseCases MUST NOT depend on Nest/Pino logging types merely to emit local exception logs.

Add tests only for behavior owned here: logger configuration, safe error serialization, redaction/HTTP serializers, trace correlation helpers, and Nest composition. Do not duplicate Pino, Nest, EDP, or future OpenTelemetry SDK behavior tests.
