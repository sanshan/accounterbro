# AccounterBro

AccounterBro is an Nx monorepo containing a NestJS API, an internal Documents service, a React web application, and PostgreSQL persistence. The current Web application includes the Documents upload flow backed by the Documents service.

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
```

The copied environment contains the safe local database, service-port, and Documents storage values. The PostgreSQL container creates the API database from those values.

The Documents service owns a separate logical database. Create it once in the existing PostgreSQL container:

```bash
docker compose exec database createdb -U postgres accounterbro_documents
```

If the database already exists, skip that creation command.

Apply both service migrations:

```bash
pnpm nx run @accounterbro/api:migration:run
pnpm nx run @accounterbro/documents-service:migration:run
```

Start the API, Documents service, and Web application in separate terminals:

```bash
pnpm nx run @accounterbro/api:serve
pnpm nx run @accounterbro/documents-service:serve
pnpm nx run @accounterbro/web:serve
```

With the default local configuration, the API runs on port `3000`, the Documents service on port `3001`, and the Web application on port `4200`.

For local development, the Vite server proxies `/documents` requests to the Documents service and supplies the repository's development request-identity headers used by the upload UI.

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
pnpm nx run @accounterbro/documents-service:migration:run
pnpm nx run-many -t test
pnpm nx run-many -t build
pnpm nx run @accounterbro/api-e2e:e2e
pnpm nx run @accounterbro/documents-service-e2e:e2e
```

The E2E targets require their normal runtime dependencies.

GitHub Actions also verifies that the built API and Web artifacts can start successfully.
