# Runtime Messaging Agent Rules

These rules apply to `@accounterbro/runtime-messaging` in addition to the root `AGENTS.md` and `packages/AGENTS.md`.

## Responsibility

`@accounterbro/runtime-messaging` owns AccounterBro's transport-neutral event ingress boundary around the published EDP `EventEnvelope` contract, plus broker-specific adapters only behind explicit transport subpaths.

The framework-independent root entrypoint owns:

- `EventIdentity`, exactly `eventName + schemaVersion`;
- executable `EventHandler` contracts;
- one structural `validateEventEnvelope(...)` boundary for untrusted logical envelope input;
- `EventHandlerRegistry` registration, exact resolution, duplicate rejection and seal state;
- `EventIngress` validation, exact dispatch and explicit unhandled outcomes.

The validator checks the required published envelope structure and metadata before handlers can trust it. It returns the original envelope object unchanged, preserves additional fields, and treats `payload` as unknown business content. Business payload validation belongs to the selected EDP `EventContract`, not this package.

Handler-thrown values, including EDP `ExecutionFailureError`, are not reclassified or wrapped by ingress. Invalid-envelope and unhandled outcomes remain distinct from execution failures.

## Registry lifecycle

One event identity maps to one handler. Resolution has no version fallback, latest selection, scanning, fan-out or dynamic post-startup mutation.

Registration is explicit. A duplicate registration is a configuration failure and prevents the registry from being sealed even if the immediate registration exception is caught. Resolution before seal and registration after seal are configuration errors.

`@accounterbro/runtime-messaging/nest` provides the ordinary `RuntimeMessagingModule`. It owns one Nest-managed registry per application context and exports that registry plus `EventIngress`. It is not global and does not use a static singleton.

Explicit application-local registrars register handlers during `onModuleInit`. `RuntimeMessagingModule` seals during `onApplicationBootstrap`, after module initialization has completed. Future consumers must start only after that sealed state; broker lifecycle is not implemented in the transport-neutral `/nest` entrypoint.

## Redpanda boundary

`@accounterbro/runtime-messaging/redpanda` is the explicit framework-independent Redpanda/Kafka transport boundary. Broker-specific dependencies and wire behavior are allowed only behind this subpath; importing the package root or transport-neutral `/nest` MUST NOT load KafkaJS, Schema Registry, Avro wire code or broker lifecycle behavior.

The proven client combination is KafkaJS `2.2.4` plus `@kafkajs/confluent-schema-registry` `4.1.0`. The Registry client owns standard Confluent framing, schema lookup and Avro binary encoding/decoding; do not reimplement those protocols locally.

Follow the canonical wire helpers under `src/lib/redpanda/` for the stable Avro Event-name mapping, `ab.event-envelope` metadata framing and aggregate Kafka-key encoding. Event names follow the repository convention of simple ASCII alphanumeric words separated by dots or hyphens, for example `document.registration-finished`; the Avro record mapping uses `_` for hyphens and `__` for dots so it stays readable, valid and collision-free. Header metadata must round-trip through JSON without silent loss. Registry schema IDs remain transport infrastructure identifiers and MUST NOT become Event handler identity.

This subpath does not own EventContract payload schema fields, Event/Envelope semantics, UseCase execution identity or producer/outbox behavior. Payload schema rendering remains EDP-owned.

## Boundaries

MUST NOT:

- import `runtime-presenters`, business packages or service internals into reusable runtime-messaging code;
- add UseCase lookup, subscription mapping, Actor/application-context conversion or Intent derivation here;
- add broker SDKs, wire codecs, retries, acknowledgement, DLQ, offsets, polling or consumer drain to the transport-neutral root or `/nest`; broker-specific behavior belongs only behind an explicit transport subpath;
- add decorators/scanning for handler discovery or multiple handlers for one event identity;
- turn structural validation into producer authentication or business payload validation;
- implement a second Avro payload renderer or Schema Registry protocol in the Redpanda adapter.

Framework-specific composition stays behind explicit integration subpaths such as `/nest`; the root entrypoint remains framework-independent.

## Verification

The Nx project name is `@accounterbro/runtime-messaging`.

Run:

```bash
pnpm nx run @accounterbro/runtime-messaging:lint
pnpm nx run @accounterbro/runtime-messaging:typecheck
pnpm nx run @accounterbro/runtime-messaging:test
pnpm nx run @accounterbro/runtime-messaging:build
```

Tests in this package cover only AccounterBro-owned validation, registry, ingress, wire mapping and Nest lifecycle behavior. Do not copy EDP execution, event-factory or business-contract test suites here.
