# Internal Service Agent Rules

These rules apply to internal services under `apps/services/` in addition to the root workspace rules.

Reusable service architecture, UseCase, runtime-consumption, dependency-direction, and testing rules are owned by `docs/engineering/service-guidelines.md`. Read that guide before designing or modifying service application behavior.

Use `apps/services/documents` as the current proven business-service host reference. Reuse only the boundaries required by the service being changed; do not copy Documents-specific behavior mechanically.

## Creation and identity

New internal services MUST be created with:

```bash
pnpm nx g @accounterbro/generators:service <name>
```

The canonical layout and identity convention is:

```text
apps/services/<name> -> @accounterbro/<name>-service
```

MUST NOT create a new internal service by invoking `@nx/nest:application`, `@nx/node:application`, or another low-level application generator directly. The repository generator owns normalization to the proven non-bundled service shell.

## Configuration

When creating or changing internal service configuration, MUST follow:

- `docs/engineering/environment-guidelines.md`;
- `docs/engineering/service-configuration-guidelines.md`.

Use `apps/api` as the proven configuration reference. Reuse the documented service-owned env schema, callable namespaced `registerAs` config factory, small `ConfigModule.forFeature` wrapper, and typed `KEY` / `ConfigType` consumption pattern.

MUST NOT introduce a generic shared Nest configuration abstraction, service-local `.env` loading, duplicate raw-variable validation, or direct `process.env` access outside the documented service configuration boundary without a concrete requirement.

## HTTP presenters and service E2E

When a service exposes `presenters/http` or adds its HTTP E2E project, MUST follow `docs/engineering/http-presenter-guidelines.md`.

The base internal-service generator remains transport-agnostic. Do not add HTTP bootstrap or E2E-specific serve configuration to every service merely because another service exposes HTTP.

## Persistence and business-package integration

When a service owns PostgreSQL persistence, MUST follow `docs/engineering/database-guidelines.md`.

When a service hosts a business package, follow the package integration contracts described in `docs/engineering/package-guidelines.md` and the service ownership boundary in `docs/engineering/service-guidelines.md`.

The service owns its real Nest/TypeORM `DataSource` lifecycle and process/runtime composition. Business packages and `@accounterbro/service-runtime` own their published integration contracts and implementation knowledge. Services MUST consume those public contracts rather than deep-import or recreate package/runtime internals.

## Shared execution runtime

For service-side Runner, Reader, UseCaseExecutor, resolver, transaction, execution-log, Outbox, and durable UseCase execution composition, follow `docs/engineering/service-guidelines.md` and consume the focused public entrypoints from `@accounterbro/service-runtime`.

`packages/service-runtime/AGENTS.md` owns implementation-local rules for changing the shared runtime package itself. Internal services MUST NOT copy those internals into service-local wrappers or documentation.

## Verification

Use the service's current Nx project configuration to select the smallest relevant lint, typecheck, test, build, migration, and E2E targets required by the change. Do not add service-specific verification commands by guessing project names from directory names.
