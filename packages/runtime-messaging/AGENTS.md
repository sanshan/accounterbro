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

Explicit application-local registrars register handlers before application bootstrap. `RuntimeMessagingBootstrap` owns sealing and exposes the same idempotent `seal()` prerequisite used by broker-specific bootstrap code. A broker consumer MUST invoke that prerequisite explicitly before opening intake instead of relying on the relative order of independent Nest bootstrap hooks.

## Redpanda boundary

`@accounterbro/runtime-messaging/redpanda` is the explicit framework-independent Redpanda/Kafka transport boundary. Broker-specific dependencies and wire behavior are allowed only behind this subpath; importing the package root or transport-neutral `/nest` MUST NOT load KafkaJS, Schema Registry, Avro wire code or broker lifecycle behavior.

The proven client combination is KafkaJS `2.2.4` plus `@kafkajs/confluent-schema-registry` `4.1.0`. The Registry client owns standard Confluent framing, schema lookup and Avro binary encoding/decoding; do not reimplement those protocols locally.

Follow the canonical wire helpers under `src/lib/redpanda/` for the stable Avro Event-name mapping, `ab.event-envelope` metadata framing and aggregate Kafka-key encoding. Event names follow the repository convention of simple ASCII alphanumeric words separated by dots or hyphens, for example `document.registration-finished`; the Avro record mapping uses `_` for hyphens and `__` for dots so it stays readable, valid and collision-free. Header metadata is typed as `Omit<AnyEventEnvelope, 'payload'>` plus the transport `wireVersion`; producer-side serialization trusts the published EDP `EventEnvelope` type and does not sanitize undeclared runtime properties. Registry schema IDs remain transport infrastructure identifiers and MUST NOT become Event handler identity.

Payload Avro schemas are rendered only by EDP `renderEventContractAvroSchema(...)` through the canonical helpers in `event-avro-schema.ts`. TopicNameStrategy subjects are exactly `<EventContract.name>-value`. Runtime encoding performs an exact read-only Registry lookup for that rendered schema before standard client encoding; decode resolves the writer schema from the Registry-framed schema ID and leaves exact business payload validation to the existing EventContract handler boundary.

Schema/Registry mutation is explicit provisioning behavior, never service startup behavior. Repository deployment/tooling should call `provisionEventContractSchema(...)` or `provisionManagedEventTopic(...)` before applications start. Provisioning uses `BACKWARD_TRANSITIVE`, configures `redpanda.value.schema.id.validation=true` plus `redpanda.value.subject.name.strategy=TopicNameStrategy`, and surfaces broker/Registry configuration errors rather than weakening those guarantees. For an existing managed topic, the requested partition count is authoritative only in the safe direction: keep an equal count, increase a smaller topic to the requested count, and fail explicitly when the existing topic has more partitions because Kafka partitions cannot be decreased. When legacy KafkaJS `AlterConfigs` is required for an existing topic, preserve only mutable `ConfigSource.TOPIC_CONFIG` overrides; do not copy broker/default inherited values into topic overrides, because that would break future inheritance. The Redpanda cluster must have schema ID validation enabled so these topic-level properties are accepted.

The Schema Registry adapter exposes narrow structural client seams for tests while production defaults still instantiate `@kafkajs/confluent-schema-registry`. Tests should fake only those owned interaction points instead of emulating Schema Registry REST resources or reproducing dependency behavior.

`@accounterbro/runtime-messaging/redpanda/nest` is the Nest composition layer for the Redpanda consumer. It owns creation of the KafkaJS consumer and DLQ producer, the Schema Registry codec, startup after explicit registry seal, transport lifecycle state, and broker-specific graceful drain. Service-level readiness composition is transport-neutral and does not belong to this Redpanda-specific entrypoint.

On Nest teardown the Redpanda consumer begins drain in `onModuleDestroy`, before later shutdown phases can close dependencies used by in-flight deliveries. The framework-independent consumer pauses topic intake, does not schedule another retry after shutdown is requested, and allows an already active terminal outcome to finish its normal commit or DLQ-then-commit path while ownership remains valid. The hosting service MUST supply an explicit `drainTimeoutMs`; do not reuse the Terminus graceful-shutdown delay or an EDP execution lease as an implicit broker drain budget. After the bounded drain, disconnect the KafkaJS consumer before the DLQ producer. A drain timeout is only a shutdown bound: it does not cancel arbitrary JavaScript work, and unfinished records retain replay semantics rather than receiving a false commit.

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

Tests in this package cover only AccounterBro-owned validation, registry, ingress, wire mapping and Nest lifecycle behavior. Redpanda/Schema Registry integration tests must likewise assert only AccounterBro-owned schema derivation, subject/config selection, provisioning-versus-runtime mutation boundaries and adapter usage. Prefer the narrow Registry client seams with deterministic in-memory fakes; do not maintain a local Schema Registry REST emulator and do not test Redpanda, Schema Registry, Avro codec or client implementation details already owned by dependencies. Do not copy EDP execution, event-factory or business-contract test suites here.
