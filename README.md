# Application Template

Production-oriented full-stack starter for building TypeScript applications in an Nx monorepo. The repository intentionally starts small: it provides working API and Web applications, PostgreSQL persistence, health endpoints, tests/E2E harnesses, CI, and architectural conventions without inventing a sample product domain.

## Stack

- Nx 23 + pnpm workspace
- Node.js 24 in CI
- NestJS 11 API
- PostgreSQL 17 + TypeORM
- React 19 + Vite
- Mantine UI
- Jest for API tests and API E2E
- Vitest/Testing Library for Web tests
- Playwright for browser E2E

## Quick start

Prerequisites:

- Node.js 24
- pnpm 10
- Docker with Docker Compose

From a clean checkout:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d database
pnpm nx run @application-template/api:migration:run
```

Start the API and Web applications in separate terminals:

```bash
pnpm nx run @application-template/api:serve
pnpm nx run @application-template/web:serve
```

The default environment exposes the API on port `3000` and the Web application on port `4200`. Override them with `API_PORT` and `WEB_PORT` in the root `.env` when needed.

Stop PostgreSQL with:

```bash
docker compose down
```

The named PostgreSQL volume is preserved. Use `docker compose down -v` only when you intentionally want to remove local database data.

## Testing and verification

Testing is intentionally visible near the beginning because the template is expected to remain continuously verifiable as features are added.

### API unit and integration tests

```bash
pnpm nx run @application-template/api:test
```

These tests exercise application/domain behavior and infrastructure integration at their owning boundaries. Database-backed integration tests require the configured PostgreSQL instance when applicable.

### API E2E

Ensure PostgreSQL is available, then run:

```bash
pnpm nx run @application-template/api-e2e:e2e
```

The E2E target runs migrations, starts the real Nest application using the non-watch `serve:e2e` configuration, and executes HTTP tests against it. The current health specification verifies both `/api/health/live` and `/api/health/ready`, making it a production-useful smoke test for application startup, routing, dependency wiring, database readiness, and the configured `API_PORT`.

### Web tests

```bash
pnpm nx run @application-template/web:test
```

Web unit/component tests use the project's configured Vitest and Testing Library setup.

### Web E2E

Install Chromium once when Playwright browsers are not already available:

```bash
pnpm exec playwright install chromium
```

Then run:

```bash
pnpm nx run @application-template/web-e2e:e2e
```

The Playwright harness currently permits zero product test cases. This is intentional at template stage: the E2E infrastructure is ready without committing the template to a fictional user flow. The harness and its managed Web server use the configured `WEB_PORT`. Real browser tests should be added with real product behavior.

### Repository checks

The main CI pipeline runs the following categories in order:

```bash
pnpm nx run-many -t lint
pnpm nx run-many -t typecheck
pnpm nx run @application-template/api:migration:run
pnpm nx run-many -t test
pnpm nx run-many -t build
pnpm nx run @application-template/api-e2e:e2e
pnpm nx run @application-template/web-e2e:e2e
```

CI also performs startup smoke checks for both API and Web after the build/E2E stages. CI intentionally uses non-default `API_PORT` and `WEB_PORT` values so the pipeline verifies that port configuration is propagated end to end rather than passing only because of hardcoded defaults.

## Environment and database

The committed `.env.example` defines the local defaults:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=application_template
API_PORT=3000
WEB_PORT=4200
```

Copy it to `.env` for local development and change values when your environment requires it. `API_PORT` controls the Nest HTTP server and API E2E target. `WEB_PORT` controls the Vite development/preview server and Playwright Web E2E harness. The Vite `/api` development proxy derives its target port from `API_PORT`, so changing the API port does not require a separate proxy edit. Do not commit credentials or secrets.

PostgreSQL is provided by `docker-compose.yaml` using PostgreSQL 17 and a persistent named volume. The container has a `pg_isready` health check.

### Migrations

Show migration status:

```bash
pnpm nx run @application-template/api:migration:show
```

Apply migrations:

```bash
pnpm nx run @application-template/api:migration:run
```

Revert the latest migration:

```bash
pnpm nx run @application-template/api:migration:revert
```

Migration generation is exposed through the API Nx target as well. Review generated migrations before committing them; schema changes are expected to be represented explicitly as migrations rather than relying on runtime synchronization.

## Health endpoints

The API exposes two operational endpoints:

```http
GET /api/health/live
GET /api/health/ready
```

### Liveness

`/api/health/live` answers whether the Nest process and HTTP application are alive. It intentionally does not depend on PostgreSQL. A temporary database outage therefore must not make the process appear dead to an orchestrator.

### Readiness

`/api/health/ready` answers whether the application is ready to serve traffic. The current readiness check executes the database health reference use case, so it requires working PostgreSQL persistence. When PostgreSQL is unavailable, readiness can fail while liveness remains healthy.

## Backend architecture

The API uses explicit responsibility boundaries:

- `application` — use-case orchestration and ports for external dependencies;
- `domain` — domain concepts, invariants, and behavior when a use case genuinely needs them;
- `infrastructure` — concrete technology adapters such as TypeORM/PostgreSQL;
- `presenters` — HTTP/transport concerns, validation, response mapping, and health indicators.

The database readiness flow is the initial canonical backend reference:

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

This flow demonstrates dependency direction and test ownership. It is **not** a requirement that every future use case contain a controller, port, domain object, mapper, repository, and persistence entity. Add only the boundaries required by the behavior being implemented.

Detailed backend placement and dependency rules live in `apps/api/AGENTS.md`.

## Web application

The Web application is a deliberately small React 19 + Vite + Mantine baseline. It does not pre-install routing, server-state/query, form, or global-state libraries before a real feature requires them.

Frontend conventions in `apps/web/AGENTS.md` cover component/feature organization, state ownership, effects, async work, render and bundle performance, accessibility, Mantine usage, testing, and how to decide when a new dependency or abstraction is justified.

## AI-assisted development

The repository is designed to be developed with coding agents while keeping architectural decisions explicit and reviewable.

Before changing code:

1. read the root `AGENTS.md` and the nearest applicable nested `AGENTS.md`;
2. identify the owning Nx project;
3. inspect the closest existing implementation with similar responsibilities;
4. determine which existing boundaries actually apply;
5. plan before modifying code when planning is requested;
6. implement the smallest coherent change;
7. add tests at the boundary that owns the behavior;
8. verify the affected projects through Nx targets.

Use these instruction files as the detailed source of truth:

- `AGENTS.md` — workspace, Nx, package management, testing, and change discipline;
- `apps/api/AGENTS.md` — backend architecture, placement, dependencies, persistence, and testing;
- `apps/web/AGENTS.md` — React architecture, performance, UI, accessibility, and testing.

Existing code is a reference for established conventions, not a structure to copy mechanically. New ports, domain models, shared components, state managers, providers, or other abstractions should appear only when a concrete feature needs them.

## Project layout

```text
apps/
├── api/       NestJS application
├── api-e2e/   HTTP E2E tests against the running API
├── web/       React/Vite application
└── web-e2e/   Playwright browser E2E harness

packages/      workspace libraries when real cross-project reuse requires them
```

Keep feature-specific code inside its owning project. Do not create shared packages merely to make the workspace appear more abstract.

## CI

GitHub Actions uses Node.js 24, pnpm 10, and PostgreSQL 17. Pull requests run linting, type checks, migrations, unit/integration tests, application builds, API E2E, Web E2E, and API/Web startup smoke checks.

The CI configuration is intentionally close to the documented local commands so failures can be reproduced through Nx rather than through CI-only scripts.
