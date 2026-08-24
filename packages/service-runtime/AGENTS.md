# Service Runtime Agent Rules

These rules apply to `packages/service-runtime/` in addition to the root workspace rules.

## Purpose

`@accounterbro/service-runtime` owns reusable AccounterBro service-composition infrastructure around published `@event-driven-platform/*` primitives.

EDP remains the source of truth for execution contracts and semantics. MUST NOT copy, fork, wrap, or reimplement EDP behavior unless AccounterBro has a concrete repository-specific composition responsibility that EDP does not own.

Keep runtime composition framework-agnostic unless a concrete task explicitly requires a framework boundary. Shared runtime code MUST NOT become Documents-specific or another business-domain implementation.

## Verification

Tests in this package MUST cover behavior implemented by AccounterBro itself: composition, adapters, mappings, invariants, and failure cases introduced here.

MUST NOT duplicate tests for behavior already owned and tested by EDP merely because `service-runtime` consumes an EDP contract. Prefer typecheck/build evidence for structural contract compatibility and add runtime tests only for AccounterBro-owned behavior.

## Operation handler resolution

The canonical Operation resolver boundary is:

- `OperationHandlerBinding` is shared runtime composition data and does not belong in `@accounterbro/core`;
- `OperationHandlerResolver` is the runtime-valued AccounterBro DI identity implementing the EDP resolver contract;
- `MapOperationHandlerResolver` owns only AccounterBro's operation-name-to-handler lookup, including duplicate-binding and missing-binding rejection;
- business packages own their Operation-name-to-handler binding groups and expose them from their Nest-agnostic `/execution` entrypoint;
- each service composes one `OperationHandlerResolver` from the binding groups of the business packages it hosts;
- do not introduce service-specific resolver tokens such as `SERVICE_OPERATION_HANDLER_RESOLVER`.
