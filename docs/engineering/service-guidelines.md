# Internal Service Engineering Guidelines

These rules define the reusable architecture and application boundaries for internal Nest services in AccounterBro.

They apply to `apps/api` and services under `apps/services/` where the corresponding responsibility exists. A service does not need to contain every documented layer or integration merely for structural symmetry.

## Canonical implemented references

Use the closest proven implementation rather than copying a complete service mechanically.

- `apps/api` is the reference for a service-owned vertical slice. Its database readiness flow demonstrates `presenter -> application -> port -> infrastructure` with domain types only where they own useful meaning.
- `apps/services/documents` is the reference for a business-service host. Its concrete UseCases orchestrate package-owned Operations/Reads through shared EDP runtime composition, while service infrastructure composes public package/runtime integration contracts.

Reference implementations demonstrate responsibility and dependency direction. They are not templates requiring every service to have the same directories, modules, ports, DTOs, mappers, or runtime capabilities.

## Service boundaries and dependency direction

The reusable service boundaries are:

```text
presenters ───────→ application ───────→ domain
                        ↑
                        │
infrastructure ─────────┘
        │
        └──────────────────────────────→ domain
```

A service may omit a boundary that has no current responsibility. Do not create empty or speculative layers merely to match this diagram.

### Domain

Domain code owns service-local domain concepts, invariants, and behavior when such behavior genuinely belongs to the service rather than to a hosted business package.

Domain code MUST NOT depend on NestJS, TypeORM, transport contracts, or infrastructure implementations.

Do not introduce a service-local domain model when the behavior is already owned by a business package or when there is no meaningful state, invariant, or behavior to represent.

### Application

Application code owns service-level use-case orchestration and application-facing abstractions.

Application code MAY depend on domain code and application-facing ports. It MUST remain unaware of TypeORM entities/repositories/DataSource, HTTP DTOs/controllers, Nest transport objects, and concrete infrastructure implementations.

Create an application port only when application behavior requires a real external capability that is not already represented by an existing package/runtime contract.

### Infrastructure

Infrastructure owns technology/runtime composition and adapters: persistence, configuration, execution runtime, external storage/providers, messaging, caches, and similar integrations.

Infrastructure MAY implement application-facing ports and compose business-package/shared-runtime public contracts. It MUST NOT move orchestration out of a UseCase merely because that orchestration invokes external technology.

When a service hosts a business package, consume the package's public integration entrypoints such as `@accounterbro/<package>/execution` and `@accounterbro/<package>/typeorm`. Do not deep-import package implementation files or reconstruct package-owned handler/persistence construction in the service.

Database lifecycle, TypeORM composition, and migration rules are defined in `docs/engineering/database-guidelines.md`. Environment and typed service configuration rules are defined in `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md`.

### Presenters

Presenters own transport adaptation and may depend on application UseCases/contracts. They MUST NOT bypass application behavior to call persistence or other infrastructure directly when a UseCase owns the orchestration.

Transport-specific DTOs, validation/binding concerns, response mapping, and framework-specific presenter adapters remain in the presenter boundary and MUST NOT leak into application/domain code.

Transport-specific detailed guidance belongs in a dedicated engineering guide once a proven reusable transport pattern exists. Until then, inspect the closest implemented presenter and applicable local agent rules rather than inventing a generic abstraction.

## Nest modules and dependency injection

Nest modules are service composition boundaries, not substitutes for application/domain design.

Application code should depend on the smallest stable abstraction or runtime contract that owns the required capability. Infrastructure modules bind those abstractions/contracts to concrete adapters and shared runtime composition.

Do not introduce parallel DI tokens, wrappers, generic repositories, base services, or framework abstractions when an existing package/runtime contract or Nest mechanism already serves the required boundary.

## Concrete service UseCases

Concrete service UseCases are application-level orchestration and use the published EDP UseCase contracts.

A concrete service UseCase MUST be a Nest `@Injectable()` provider using the default singleton scope unless a concrete reviewed requirement proves another scope is necessary.

Constructor dependencies are reserved for stable reusable collaborators such as Runner, Reader, storage capabilities, repositories/ports, or other long-lived dependencies. Invocation-specific metadata MUST NOT be stored on the singleton instance or introduced through request-scoped DI merely for convenience.

Each UseCase MUST define its own concrete context type extending EDP `UseCaseContext` with exactly the additional invocation metadata it needs. Keep the context beside the UseCase as:

```text
<use-case-name>.use-case.context.ts
```

Actor, tenant, and similar invocation values belong in that concrete context only when the UseCase requires them. Preserve typed concrete-context flow end to end through `UseCaseExecutor`; do not hide invocation metadata in AsyncLocalStorage, ambient current-user/current-tenant providers, casts, or local executor wrappers.

UseCase behavioral tests are specification-level tests. They MUST verify observable behavior required by the owning specification. They MUST NOT test Nest scope, constructor shape, context-file placement, or EDP implementation mechanics unless the specification makes such behavior observable.

## UseCase implementation preflight

Before designing or modifying a concrete service UseCase, inspect the current implementation and semantics of every execution boundary the UseCase will actually use:

- `UseCaseExecutor` for durable UseCase execution;
- Runner for child Operations and Reader for child Reads when those paths are used;
- each concrete Operation/Read invoked by the UseCase and its handler;
- the relevant persistence/database implementation and constraints when they own behavior related to deduplication, idempotency, transactions, recovery, concurrency, or result semantics.

The purpose is to establish existing ownership before adding orchestration logic.

MUST NOT add a UseCase-local check, recovery Read, idempotency/deduplication mechanism, retry policy, progress state, transaction workaround, concurrency guard, or similar execution behavior until inspection proves the existing EDP runtime and called Operation/Read/persistence boundaries do not already own the requirement.

When preparing an implementation issue for a concrete UseCase, copy constraining findings into the issue's required `## Do not` section. Name the concrete existing owner/mechanism where practical; a generic instruction such as "do not duplicate existing behavior" is insufficient when the investigation can identify the owner.

## Shared EDP runtime consumption

Internal services consume reusable AccounterBro execution composition from `@accounterbro/service-runtime` instead of reconstructing the standard EDP dependency graph locally.

Use the focused public entrypoint that owns the required capability, including the established Runner, Reader, UseCaseExecutor, resolver, TypeORM transaction, and durable runtime-store integrations.

The service owns its Nest/process composition and concrete service inputs. `@accounterbro/service-runtime` owns the reusable AccounterBro composition choices around published EDP contracts, while EDP remains the source of truth for execution semantics.

MUST NOT introduce service-local implementations/wrappers for Runner, Reader, UseCaseExecutor, handler resolvers, transaction propagation, execution-log persistence, Outbox persistence, or UseCase execution persistence when the shared runtime already owns that capability.

For exact runtime composition contracts and implementation invariants, inspect the current public `@accounterbro/service-runtime` entrypoint and `packages/service-runtime/AGENTS.md`. Do not copy those implementation details into service code or duplicate them in service documentation.

## Business package hosting

A business package owns its business model, Operations/Reads/handlers, and package persistence integration contracts. A hosting service owns process/runtime composition around those public contracts.

The service MAY register package-exported provider/binding groups and package TypeORM contributions required by the behavior it hosts. It MUST NOT deep-import concrete package handlers/entities/migrations/adapters or duplicate package-owned construction/mapping knowledge.

Use `packages/documents` together with `apps/services/documents` as the current paired reference for this boundary. Apply only the parts required by the service being changed.

## Testing ownership

Tests stay at the boundary that owns the behavior:

- concrete UseCase specs verify specification-visible application orchestration;
- service composition tests verify service-owned Nest/runtime wiring only when that wiring introduces behavior worth proving;
- package tests own package aggregate/handler/persistence/composition behavior;
- shared runtime tests own AccounterBro runtime adapters/composition;
- persistence integration tests own database-specific adapter guarantees;
- presenter tests own behavior introduced by their transport adapter;
- E2E tests verify important running-service integration boundaries and do not replace lower-level owner tests.

MUST NOT duplicate EDP Runner/Reader/UseCaseExecutor semantics in service tests merely because a service consumes those contracts.

## Change discipline

Before adding a service-level abstraction or integration pattern:

1. inspect the closest current service implementation;
2. identify the existing owner of the required behavior;
3. reuse its public contract/pattern when it applies;
4. add only the layer/files required by the concrete behavior;
5. keep the change within the owning service/package/runtime boundary.

Do not make every internal service structurally identical when their responsibilities differ. Consistency means reusing proven boundaries and ownership, not copying unused architecture.