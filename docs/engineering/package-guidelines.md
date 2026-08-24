# Package Engineering Guidelines

Rules for implementing and reviewing AccounterBro business packages.

Normative keywords:

- **MUST** — required.
- **MUST NOT** — prohibited.
- **SHOULD** — preferred; deviation requires a concrete reason.

## Package creation

- **PKG-000** — A new business package MUST be created with `pnpm nx g @accounterbro/generators:package <name>`. Direct use of `@nx/js:lib` for new business packages is not supported.

## Package boundaries

- **PKG-001** — A business package MUST NOT depend on another business package.
- **PKG-002** — A business package MUST use cross-domain identities and references from `@accounterbro/core`.
- **PKG-003** — A business package MUST NOT redefine an identity or reference available from `@accounterbro/core`.
- **PKG-004** — Ports MUST be placed under `packages/[package-name]/src/lib/ports/`.

## Core identities

- **CORE-001** — Before implementing a business package, its domain identity MUST already exist in `@accounterbro/core`.
- **CORE-002** — Before implementing a business package, verify that Core provides its domain name, branded ID, and required reference types.
- **CORE-003** — If a required identity or reference is missing from Core, business-package implementation MUST stop. Add the missing Core contract first in a separate prerequisite task.
- **CORE-004** — Core owns cross-domain names, branded IDs, and reference types.
- **CORE-005** — Core MUST use generic primitives from `@event-driven-platform/*` instead of introducing equivalent local abstractions.
- **CORE-006** — Core MUST NOT contain aggregates, domain statuses, operations, reads, events, persistence, or business behavior.

## Domain model

- **DOMAIN-001** — A domain aggregate MUST be implemented as a class.
- **DOMAIN-002** — Each aggregate MUST be placed at `packages/[package-name]/src/lib/[domain-name]/[domain-name].aggregate.ts`.
- **DOMAIN-003** — Domain statuses MUST be represented by enums.
- **DOMAIN-004** — An aggregate MUST own the business invariants that govern its state.
- **DOMAIN-005** — State-transition validation MUST be performed by the aggregate, not by an operation handler.
- **DOMAIN-006** — State transitions SHOULD be exposed as aggregate methods instead of being constructed externally.

## Typed values

- **TYPE-001** — Branded IDs MUST use `Brand<TValue, TBrand>` from `@event-driven-platform/types`.
- **TYPE-002** — Brand names MUST identify the domain identity. Generic brands such as `String`, `Id`, or `Identifier` MUST NOT be used.
- **TYPE-003** — Code MUST use the domain-specific ID/reference exported by Core instead of reconstructing its generic EDP type.
- **TYPE-004** — Typed object literals SHOULD use `satisfies` when the compiler cannot otherwise verify the intended contract without widening or assertion.
- **TYPE-005** — `as unknown` and `as unknown as ...` MUST NOT be used to bypass type incompatibility. Fix the type boundary instead.

## Operations

- **OP-001** — Each operation MUST have its own directory: `packages/[package-name]/src/lib/operations/[operation-name]/`.
- **OP-002** — Operation files MUST use `[operation-name].operation.ts`, `[operation-name].handler.ts`, and `[operation-name].handler.spec.ts`.
- **OP-003** — Operation names MUST be declared in `packages/[package-name]/src/lib/operations/names.ts`.
- **OP-004** — Operation names MUST be exposed through `[camelCaseDomainName]OperationNames`.
- **OP-005** — An operation name MUST use the domain name from Core and an imperative kebab-case action: `[domain-name].[imperative-action]`.
- **OP-006** — Operation handlers MUST orchestrate application flow and MUST NOT implement aggregate invariants or state-transition rules.
- **OP-007** — A business package MUST own its EDP `OperationHandler` implementations and the knowledge required to construct them.
- **OP-008** — Business-package Operation handler classes MUST remain framework-agnostic. They MUST NOT use Nest decorators or import NestJS merely for service composition.
- **OP-009** — Service-facing Operation handler provisioning MUST be exposed through a dedicated Nest-agnostic package entrypoint such as `@accounterbro/<package>/execution`, not by requiring the service to deep-import concrete handlers.
- **OP-010** — The package execution entrypoint MUST expose Nest-compatible provider descriptors as ordinary object literals with `provide`, `inject`, and `useFactory`; the package MUST NOT import or reproduce Nest `Provider` / `FactoryProvider` types.
- **OP-011** — Operation handler provider descriptors MUST inject package-owned runtime ports/contracts and construct concrete handlers inside the package. A hosting service MUST NOT recreate handler constructors or duplicate their dependency knowledge.
- **OP-012** — Concrete Operation handler classes MUST NOT be exported from the package's main business entrypoint solely for service composition when the package execution entrypoint already owns provisioning.
- **OP-013** — A business package MUST own its Operation-name-to-handler mapping and expose one package-specific binding group from its `/execution` entrypoint. A hosting service MUST NOT recreate that mapping.
- **OP-014** — Package Operation-handler binding descriptors MUST remain Nest-compatible and Nest-agnostic ordinary objects. They MAY depend on `OperationHandlerBinding` from `@accounterbro/service-runtime`, but MUST NOT import Nest provider types.
- **OP-015** — A package binding group MUST reference the package's exported Operation-name constants rather than repeating raw Operation names.
- **OP-016** — Shared resolver identity and lookup implementation belong to `@accounterbro/service-runtime`, not `@accounterbro/core` or a business package.

## Reads

- **READ-001** — Each read MUST have its own directory: `packages/[package-name]/src/lib/reads/[read-name]/`.
- **READ-002** — Read files MUST use `[read-name].read.ts`, `[read-name].handler.ts`, and `[read-name].handler.spec.ts`.
- **READ-003** — Read names MUST be declared in `packages/[package-name]/src/lib/reads/names.ts`.
- **READ-004** — Read names MUST be exposed through `[camelCaseDomainName]ReadNames`.
- **READ-005** — A read name MUST use the domain name from Core and an imperative kebab-case action: `[domain-name].[imperative-action]`.

## Events

- **EVENT-001** — Each event MUST have its own directory: `packages/[package-name]/src/lib/events/[event-name]/`.
- **EVENT-002** — An event file MUST use `[event-name].event.ts`.
- **EVENT-003** — Event names MUST be declared in `packages/[package-name]/src/lib/events/names.ts`.
- **EVENT-004** — Event names MUST be exposed through `[camelCaseDomainName]EventNames`.
- **EVENT-005** — An event name MUST use the domain name from Core and describe the completed parent operation in past tense: `[domain-name].[past-tense-event]`.
- **EVENT-006** — Package events MUST be implemented as classes.
- **EVENT-007** — Event class names MUST end with `Event`.

## Persistence

- **DB-001** — Persistence entities MUST NOT contain business behavior.
- **DB-002** — Persistence entities and domain aggregates MUST remain separate representations.
- **DB-003** — Persistence mappers MUST only translate between persistence and domain representations; they MUST NOT implement business rules.
- **DB-004** — Invariants that must remain correct under concurrent writes MUST be enforced by the database.
- **DB-005** — Expected business outcomes MUST NOT expose database-specific errors to business handlers.

## TypeORM integration

- **DB-006** — A business package that persists its business state with TypeORM MUST own the corresponding TypeORM schema artifacts, including its entities and migrations.
- **DB-007** — A business package MUST NOT create, initialize, destroy, observe, or configure a TypeORM `DataSource`; the hosting business service owns the real `DataSource` lifecycle and connection configuration.
- **DB-008** — Package-owned TypeORM integration MUST be exposed through a dedicated Nest-agnostic public entrypoint such as `@accounterbro/<package>/typeorm`, not through the package's main business entrypoint.
- **DB-009** — The TypeORM entrypoint MUST expose package composition contracts such as `<PACKAGE>_TYPEORM_ENTITIES` and, when package-owned migrations exist, `<PACKAGE>_TYPEORM_MIGRATIONS`. Consumers MUST use those contracts instead of deep-importing concrete entity or migration implementation files.
- **DB-010** — A package TypeORM integration boundary MAY depend on TypeORM but MUST NOT depend on NestJS merely to participate in service persistence composition.
- **DB-011** — TypeORM-specific entities, migrations, mappers, repositories, and persistence implementation classes MUST NOT be exported from the main business entrypoint solely for service composition.
- **DB-012** — A persistence port that is used as a Nest DI token MUST be a runtime value, normally an `abstract class`; a TypeScript-only interface is insufficient for that composition boundary.
- **DB-013** — Infrastructure-facing persistence ports used for TypeORM service composition MUST be exported from the package's `/typeorm` entrypoint. The main business entrypoint MUST NOT be expanded merely to expose those ports to Nest wiring.
- **DB-014** — The package `/typeorm` entrypoint MUST expose one package-owned factory per persistence port that needs service composition. The factory accepts TypeORM primitives such as `DataSource` and constructs the package-owned concrete adapter internally.
- **DB-015** — Package TypeORM factories MUST keep entity, mapper, repository, and concrete persistence implementation knowledge inside the business package. A hosting service MUST NOT recreate adapter construction or import those implementation details.
- **DB-016** — Package TypeORM factories MUST remain Nest-agnostic. They MUST NOT import Nest provider types or decorators; the hosting service owns Nest provider descriptors and injects its service-owned `DataSource` into the package factory.
- **DB-017** — Package TypeORM factories MUST continue to accept the normal TypeORM `DataSource` contract and MUST remain unaware of `AsyncLocalStorage`, `QueryRunner`, or execution-transaction propagation.
- **DB-018** — Transaction participation for package persistence is a hosting-runtime concern. A service that needs EDP execution transactions MUST supply the shared transaction-aware `DataSource` from `@accounterbro/service-runtime/typeorm` to the unchanged package factory instead of adding transaction plumbing to the business package.
- **DB-019** — A business package MUST NOT introduce its own ambient transaction context or repository-switching proxy to participate in EDP execution; the canonical implementation belongs to shared service runtime.
- **DB-020** — Reusable service-runtime TypeORM persistence belongs to the shared runtime package that owns the behavior and schema, not to a business package or individual service. Its public integration MUST use a focused Nest-agnostic subpath and expose entity/migration composition contracts.
- **DB-021** — EDP `ExecutionLogStore` TypeORM integration MUST use `@accounterbro/service-runtime/execution-log/typeorm`; services MUST NOT implement a local execution-log adapter or copy claim/reclaim/fencing behavior.
- **DB-022** — Shared runtime stores that must participate in an EDP execution transaction MUST receive the transaction-aware `DataSource` from `@accounterbro/service-runtime/typeorm` and remain unaware of `AsyncLocalStorage` / `QueryRunner` transaction plumbing.
- **DB-023** — Tests for shared runtime persistence MUST verify AccounterBro-owned adapter guarantees only, such as database concurrency, fencing, schema invariants, or transaction participation. They MUST NOT duplicate EDP contract-shape or Runner behavior tests.
- **DB-024** — EDP `OutboxStore` TypeORM integration MUST use `@accounterbro/service-runtime/outbox/typeorm`; services MUST NOT implement a local Outbox adapter or application polling publisher.
- **DB-025** — Shared Outbox persistence MUST remain append-only, store the authoritative EDP Event envelope plus required search/CDC projections, and MUST NOT add application delivery lifecycle state because publication is CDC-owned.

## Service runtime composition

- **RUNTIME-001** — Reusable Runner composition MUST be exposed from `@accounterbro/service-runtime/runner` and MUST delegate construction to the published EDP `createRunner()` API. AccounterBro MUST NOT implement, subclass, or fork Runner behavior.
- **RUNTIME-002** — The shared Runner composition MUST use the published EDP `DefaultExecutionIdFactory`, `DefaultEventIdFactory`, `DefaultOperationEventEnvelopeFactory`, and `DefaultOutboxRecordFactory` directly. Services MUST NOT introduce local replacements or duplicate the standard factory graph.
- **RUNTIME-003** — One caller-supplied EDP `Clock` instance MUST be reused by Runner and the EDP event/outbox factories. Production services use one `SystemClock`; deterministic tests MAY use `FixedClock`.
- **RUNTIME-004** — `ExecutionLeaseOwnerId` MUST identify one concrete running process/replica and MUST NOT be a stable logical service name shared across replicas. The hosting service creates it once for the process lifetime and supplies it to shared runtime composition.
- **RUNTIME-005** — The canonical Runner lease duration is `30_000` ms. Services MUST NOT add per-service lease-duration configuration or enable optional Runner policies without a concrete reviewed requirement.
- **RUNTIME-006** — Tests for shared runtime composition MUST verify only AccounterBro-owned wiring/default choices. They MUST NOT duplicate EDP Runner, factory, transition, retry, timeout, guard, or rate-limit behavior tests.

## Names

- **NAME-001** — Domain names used by business packages MUST come from `@accounterbro/core`.
- **NAME-002** — After an operation, read, or event name is declared in its `names.ts`, package code MUST reference that declaration instead of repeating the raw string.

## Platform integration tests

- **TEST-001** — Tests MUST verify behavior implemented by AccounterBro at the owning boundary. They MUST NOT duplicate EDP tests or restate EDP-owned semantics merely because AccounterBro consumes an EDP contract.
- **TEST-002** — When an AccounterBro package adds composition around EDP, tests SHOULD target only the added mapping, adapter, provider, invariant, or failure behavior; use typecheck/build evidence for structural contract compatibility where sufficient.

## Review behavior

- **REVIEW-001** — Review findings MUST identify the violated rule ID.
- **REVIEW-002** — A finding MUST cite concrete code evidence. Do not report a violation based only on speculation about future code.
- **REVIEW-003** — Do not request abstractions, extensibility, or infrastructure that is not required by the current specification or these guidelines.
- **REVIEW-004** — When no guideline is violated and the specification does not require a change, the reviewer MUST NOT invent a requirement.
- **REVIEW-005** — If implementation requires violating a MUST/MUST NOT rule, stop and surface the conflict instead of silently working around it.
