# Internal Service Agent Rules

These rules apply to internal services under `apps/services/` in addition to the root workspace rules.

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

When creating or changing internal service configuration, MUST follow `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md`.

Use `apps/api` as the proven configuration reference. Reuse the documented service-owned env schema, callable namespaced `registerAs` config factory, small `ConfigModule.forFeature` wrapper, and typed `KEY` / `ConfigType` consumption pattern.

MUST NOT introduce a generic shared Nest configuration abstraction, service-local `.env` loading, duplicate raw-variable validation, or direct `process.env` access outside the documented service configuration boundary without a concrete requirement.

## Database and migrations

When a service owns PostgreSQL persistence, MUST follow `docs/engineering/database-guidelines.md`.

Use the official Nest `@nestjs/typeorm` lifecycle pattern: `TypeOrmModule.forRootAsync(...)` for the runtime connection, `TypeOrmModule.forFeature(...)` for service persistence registration, and a service-local TypeORM CLI `DataSource` that reuses the same typed service config and pure TypeORM options factory.

MUST NOT add a custom database lifecycle service around `DataSource.initialize()` / `destroy()`, enable schema synchronization, auto-run migrations during application bootstrap, or share another service's persistence implementation.
