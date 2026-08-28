# Runtime Health Agent Rules

These rules apply to `@accounterbro/runtime-health` in addition to root and `packages/AGENTS.md`.

## Responsibility

`@accounterbro/runtime-health` owns reusable, transport-independent service health contracts and technical health capabilities.

The root entrypoint stays framework-agnostic. It MUST NOT depend on NestJS, Terminus, TypeORM, EDP, or concrete services.

`ReadinessCheck` is the canonical readiness boundary:

- `name` is the stable identity used by adapters when reporting the check;
- `check()` resolves when the dependency/capability is ready;
- `check()` rejects when it is not ready;
- transport-specific status codes, response DTOs, logging, and error presentation do not belong in this contract.

## Subpaths

Framework-specific capabilities belong behind explicit public subpaths instead of leaking into the root entrypoint.

TypeORM-specific database readiness belongs under `@accounterbro/runtime-health/typeorm`. The hosting service remains responsible for its real `DataSource` lifecycle, configuration, and migration execution.

Nest/Terminus HTTP presentation belongs to `@accounterbro/runtime-presenters/http/health`, not this package.

## Boundaries

MUST NOT:

- route health checks through `UseCaseExecutor`, Runner, Reader, or other EDP execution mechanisms merely for symmetry;
- add service-specific configuration or dependencies;
- introduce registries, background polling, caching, metrics, or additional health states without a concrete consumer requirement;
- duplicate transport or persistence behavior owned by another package.

Keep dependencies and public exports minimal. Add tests only for runtime behavior owned by this package; TypeScript-only contract shape is verified by typecheck/build rather than behaviorless tests.
