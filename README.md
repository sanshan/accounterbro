# AccounterBro

AccounterBro is an Nx monorepo containing a NestJS API, React web application, and PostgreSQL persistence. This repository is the product baseline; product behavior will be added incrementally.

## Prerequisites

- Node.js 24
- pnpm 10
- Docker with Docker Compose

## Local setup

From the repository root:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d database
pnpm nx run @accounterbro/api:migration:run
```

Start the API and Web applications in separate terminals:

```bash
pnpm nx run @accounterbro/api:serve
pnpm nx run @accounterbro/web:serve
```

With the default `.env.example` configuration, the API runs on port `3000` and the Web application on port `4200`.

Stop PostgreSQL with:

```bash
docker compose down
```

## Verification

Run the repository checks from the root:

```bash
pnpm nx run-many -t lint
pnpm nx run-many -t typecheck
pnpm nx run @accounterbro/api:migration:run
pnpm nx run-many -t test
pnpm nx run-many -t build
pnpm nx run @accounterbro/api-e2e:e2e
pnpm nx run @accounterbro/web-e2e:e2e
```

The API and Web E2E targets require their normal runtime dependencies. For local Web E2E runs, install the Playwright Chromium browser first when it is not already available:

```bash
pnpm exec playwright install chromium
```

GitHub Actions also verifies that the built API and Web artifacts can start successfully.
