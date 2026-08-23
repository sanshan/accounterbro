# Internal Service Agent Rules

These rules apply to internal services under `apps/services/` in addition to the root workspace rules.

## Configuration

When creating or changing internal service configuration, MUST follow `docs/engineering/environment-guidelines.md` and `docs/engineering/service-configuration-guidelines.md`.

Use `apps/api` as the proven configuration reference. Reuse the documented service-owned env schema, callable namespaced `registerAs` config factory, small `ConfigModule.forFeature` wrapper, and typed `KEY` / `ConfigType` consumption pattern.

MUST NOT introduce a generic shared Nest configuration abstraction, service-local `.env` loading, duplicate raw-variable validation, or direct `process.env` access outside the documented service configuration boundary without a concrete requirement.

## Database and migrations

When a service owns PostgreSQL persistence, MUST follow `docs/engineering/database-guidelines.md`.

Use the official Nest `@nestjs/typeorm` lifecycle pattern: `TypeOrmModule.forRootAsync(...)` for the runtime connection, `TypeOrmModule.forFeature(...)` for service persistence registration, and a service-local TypeORM CLI `DataSource` that reuses the same typed service config and pure TypeORM options factory.

MUST NOT add a custom database lifecycle service around `DataSource.initialize()` / `destroy()`, enable schema synchronization, auto-run migrations during application bootstrap, or share another service's persistence implementation.
