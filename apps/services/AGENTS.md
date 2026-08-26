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

## HTTP presenter runtime

Adding a `presenters/http` boundary makes the hosting service an HTTP server process. The service MUST then have a complete runnable HTTP bootstrap rather than remain an application-context-only Nest process.

A service with `presenters/http` MUST:

- create the Nest application with `NestFactory.create(...)`, not only `createApplicationContext(...)`;
- expose its listen port through the canonical typed service configuration boundary;
- use `@accounterbro/runtime-config` for the raw port when the same port is consumed by workspace/E2E tooling, so the raw environment variable has one validation owner;
- obtain the namespaced service config through its existing `registerAs` `KEY` / `ConfigType` contract in `main.ts`;
- call `app.listen(config.port)` during bootstrap;
- preserve shutdown hooks and other process lifecycle behavior already owned by the service.

Use `apps/api/src/main.ts` and `apps/api/src/app/infrastructure/config/api.config.ts` as the proven HTTP bootstrap/configuration reference. Do not hard-code ports in bootstrap code or validate the same raw port again in the service-local env schema when `@accounterbro/runtime-config` already owns it.

The base internal-service generator remains transport-agnostic. Do not add an HTTP listener to every generated service merely because some services expose HTTP presenters.

Transport-adapter rules below `presenters/http` remain governed by the nearest applicable presenter instructions until a repository-wide HTTP presenter guide owns them.

## Service E2E projects

Create the E2E project for an internal HTTP service with:

```bash
pnpm nx g @accounterbro/generators:service-e2e <name>
```

The canonical layout and identity are:

```text
apps/services/<name>-e2e -> @accounterbro/<name>-service-e2e
```

The service MUST already satisfy the HTTP presenter runtime contract above before adding its E2E harness. The service-E2E generator owns the reusable Jest/SWC support project, the dependency on the target service, the migration + HTTP-server orchestration, and the `e2e` configuration added to the service's existing `serve` target.

Service E2E Jest projects MUST be excluded from the root `@nx/jest/plugin` generic `test` inference and executed through their explicit `e2e` target so the generated server dependency runs before HTTP tests.

The base service generator remains transport-agnostic and MUST NOT receive an E2E-specific serve configuration preemptively. Add that configuration only when the service E2E project is created.

Use `apps/api-e2e` as the proven network E2E reference. Service E2E tests MAY test service-owned HTTP behavior, but MUST NOT duplicate UseCase, EDP runtime, persistence, or other lower-boundary semantics already covered by their owning tests.

## Persistence and business-package integration

When a service owns PostgreSQL persistence, MUST follow `docs/engineering/database-guidelines.md`.

When a service hosts a business package, follow the package integration contracts described in `docs/engineering/package-guidelines.md` and the service ownership boundary in `docs/engineering/service-guidelines.md`.

The service owns its real Nest/TypeORM `DataSource` lifecycle and process/runtime composition. Business packages and `@accounterbro/service-runtime` own their published integration contracts and implementation knowledge. Services MUST consume those public contracts rather than deep-import or recreate package/runtime internals.

## Shared execution runtime

For service-side Runner, Reader, UseCaseExecutor, resolver, transaction, execution-log, Outbox, and durable UseCase execution composition, follow `docs/engineering/service-guidelines.md` and consume the focused public entrypoints from `@accounterbro/service-runtime`.

`packages/service-runtime/AGENTS.md` owns implementation-local rules for changing the shared runtime package itself. Internal services MUST NOT copy those internals into service-local wrappers or documentation.

## Verification

Use the service's current Nx project configuration to select the smallest relevant lint, typecheck, test, build, migration, and E2E targets required by the change. Do not add service-specific verification commands by guessing project names from directory names.