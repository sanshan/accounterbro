# API Agent Rules

These rules apply to `apps/api` in addition to the workspace rules from the root `AGENTS.md`.

## 1. Canonical Backend Reference

Before planning or implementing a backend use case, inspect the closest existing implementation with the same responsibilities.

The initial canonical vertical slice is the database readiness flow:

```text
HTTP / Terminus
      ↓
HealthController / DatabaseHealthIndicator
      ↓
CheckDatabaseHealthUseCase
      ↓
DatabaseHealthCheckPort
      ↓
TypeORM persistence adapter
      ↓
entity / mapper / PostgreSQL
```

This reference demonstrates dependency direction, file placement, persistence boundaries, and test ownership. It is not a requirement that every future use case mechanically contain every layer.

MUST NOT create ports, domain objects, mappers, adapters, DTOs, or extra modules merely to make a new use case look like the reference implementation.

## 2. Layer Dependency Rules

The API is organized around these top-level boundaries:

```text
application
domain
infrastructure
presenters
```

Preferred dependency direction:

```text
presenters ───────→ application ───────→ domain
                        ↑
                        │
infrastructure ─────────┘
        │
        └──────────────────────────────→ domain
```

### Domain

Domain code owns domain concepts, invariants, and behavior.

MUST NOT depend on:

- NestJS;
- TypeORM;
- presenters/HTTP contracts;
- infrastructure implementations.

Do not create a domain model when the use case has no meaningful domain state, invariant, or behavior to represent.

### Application

Application code owns use-case orchestration and application-facing abstractions.

Application MAY depend on domain code and application ports.

MUST NOT import TypeORM entities, repositories, `DataSource`, HTTP DTOs, controllers, or transport-specific types.

### Infrastructure

Infrastructure owns implementations that interact with databases, external services, messaging, caches, filesystems, or other technologies.

Infrastructure MAY depend on application ports/contracts and domain types when implementing boundaries.

Infrastructure MUST NOT move orchestration that belongs to a use case out of the application layer merely because the implementation uses an external technology.

### Presenters

Presenters own transport concerns such as HTTP controllers, validation DTOs, response mapping, and Terminus indicators.

Presenters MAY depend on application use cases/contracts.

MUST NOT:

- call TypeORM repositories or `DataSource` directly;
- duplicate persistence/business orchestration from use cases;
- expose persistence entities as HTTP contracts.

Controllers should remain thin.

## 3. Application File Placement

Current application structure:

```text
application/
├── application.module.ts
├── ports/
└── use-cases/
```

New use cases belong under:

```text
application/use-cases/<area>/<capability>/<use-case>/
```

Use the closest existing structure as source of truth. The current system health checks live under:

```text
application/use-cases/system/health-check/check-database-health/
```

Rules:

- one cohesive use case per directory;
- keep its focused unit spec next to the use case;
- use-case-specific request/result types may live next to the use case when not shared more broadly;
- group use cases by application capability, not by technical framework;
- application ports belong in `application/ports` when they abstract a real external dependency;
- define the smallest port needed by the application behavior.

MUST NOT introduce generic repository/service/base-use-case abstractions without a current repeated need.

## 4. Domain File Placement

Organize domain models by domain area rather than placing unrelated models flat in the `domain` root.

Example:

```text
domain/
└── system/
    └── health-check/
        └── database-health-probe.ts
```

Future business areas should become sibling domain areas when real behavior requires them.

A use case does not automatically require an aggregate, entity, or value object. Introduce domain types only when they own meaningful state, invariants, or behavior.

## 5. Infrastructure File Placement

Current persistence implementation uses TypeORM under:

```text
infrastructure/
└── persistence/
    └── typeorm/
        ├── entities/
        ├── mappers/
        ├── repositories/
        └── migrations/
```

Responsibilities:

- `entities/` contain persistence representations and TypeORM metadata;
- `mappers/` translate persistence representations to/from domain/application representations where required;
- `repositories/` contain concrete adapters implementing application-facing ports;
- `migrations/` own schema evolution.

When future integrations are genuinely required, group them by integration/technology boundary, for example:

```text
infrastructure/
├── persistence/
├── messaging/
├── cache/
└── providers/
```

Do not create these directories or abstractions before there is a real consumer.

## 6. Presentation File Placement

HTTP presentation lives under:

```text
presenters/http/<feature>/
```

The current health presentation is the reference for production health endpoints.

Feature-specific HTTP code may include, when required:

```text
controllers/
dto/
mappers/
indicators/
```

Use the repository's existing exact layout when it differs; do not reorganize existing code solely to match this illustrative tree.

Responsibilities:

- controllers: routing, validation boundary, status/transport orchestration;
- DTOs: HTTP request/response contracts;
- presenter mappers: application/domain result → HTTP representation;
- indicators: Terminus-specific presentation adapters.

HTTP DTOs and Terminus-specific types belong to presentation, not application/domain.

## 7. Dependency Injection and Modules

Follow existing Nest module boundaries and provider wiring.

Application code should depend on application abstractions rather than concrete infrastructure implementations.

When adding a new adapter:

1. define a port only if the application requires an external capability;
2. implement it in infrastructure;
3. bind the abstraction to the implementation through the existing Nest module structure;
4. keep application code unaware of TypeORM/provider details.

Do not introduce a DI abstraction solely for symmetry.

## 8. New Use-Case Workflow

When planning or implementing a backend use case:

1. Read root and API `AGENTS.md` files.
2. Find the closest existing use case and its tests.
3. Inspect only the architectural layers relevant to that behavior.
4. Decide which layers are actually required.
5. Prepare a plan before modification when planning is requested.
6. Implement application behavior first.
7. Introduce application ports only for real external dependencies.
8. Add domain types only for real domain responsibility.
9. Add infrastructure adapters only where the use case requires external interaction.
10. Add presentation only when the behavior is exposed through a transport.
11. Add tests at the layer that owns the behavior.
12. Avoid unrelated refactoring and speculative generic abstractions.

MUST NOT create a parallel architecture when an established repository pattern already serves the same responsibility.

## 9. Testing Ownership

### Application/use-case specs

Use-case specs own orchestration and behavior at the application boundary.

Prefer mocked/fake ports for focused application tests. Cover important success/failure/cleanup semantics without requiring external infrastructure.

### Persistence integration tests

Persistence integration tests own TypeORM/entity/mapper/adapter behavior against PostgreSQL where database behavior matters.

They should prove the concrete adapter satisfies the application contract rather than duplicate every use-case scenario.

### Presentation specs

Controller/indicator specs own HTTP/Terminus presentation behavior, status semantics, mapping, and dependency independence where relevant.

Do not retest persistence internals through controller unit tests.

### API E2E

`apps/api-e2e` owns real HTTP integration through the running Nest application. The existing health E2E is the canonical smoke example.

E2E verifies important integration boundaries and does not replace focused application, persistence, or presentation tests.

## 10. Persistence Discipline

MUST:

- change schema through migrations;
- keep TypeORM decorators/metadata in infrastructure entities;
- map persistence representations explicitly when domain/application representations differ;
- keep deterministic integration tests isolated and clean up created data.

MUST NOT:

- expose TypeORM entities outside persistence merely for convenience;
- access repositories directly from controllers;
- make the application layer depend on database implementation details;
- introduce generic base repositories/entities without a demonstrated repeated need.

## 11. Health Reference Specifics

The database health implementation is production functionality and canonical reference code.

The persistence probe demonstrates:

```text
create probe
    ↓
write
    ↓
read + validate
    ↓
cleanup
```

Cleanup is attempted after a successful write even when read/validation fails. Preserve this behavior unless a concrete requirement changes it.

Liveness remains independent of external infrastructure; readiness composes the database check through presentation/Terminus.

Future subsystem health checks should become sibling application use cases when required rather than adding external-system orchestration directly to the health controller.

## 12. Required Verification

For API changes, run the relevant subset of:

```bash
pnpm nx run @application-template/api:lint
pnpm nx run @application-template/api:typecheck
pnpm nx run @application-template/api:test
pnpm nx run @application-template/api:build
```

When persistence behavior changes, run the relevant PostgreSQL-backed integration tests/migrations.

When HTTP behavior or end-to-end wiring changes, run the relevant API E2E target as well.

Do not declare API work complete when relevant unit/integration/presentation/E2E checks are known to fail.