# Environment Variable Guidelines

These rules define how AccounterBro workspace tasks and internal services receive, own, and validate environment variables.

## Authoritative runtime input

`process.env` is the authoritative environment input for Node.js runtime code.

Application, configuration, persistence, and CLI code MUST NOT locate or load `.env` files directly. Code that needs configuration reads already-populated environment variables through the owning typed configuration boundary.

## Local workspace `.env`

The repository-root `.env` is a local-development convenience for commands executed through Nx. It is not an application configuration source or deployment contract.

The repository-root `.env.example` documents safe example values required for local development. Secrets MUST NOT be committed.

AccounterBro does not use project-local `.env` files or environment-specific `.env` cascades. Add such files only when a concrete requirement proves that the root workspace convention is insufficient.

Nx is responsible for loading supported workspace environment files for Nx targets. Existing variables supplied by the shell or another parent process take precedence over values loaded from env files.

## Ownership and naming

Every environment variable has an owner.

- A service-owned variable belongs to the service configuration boundary that validates and maps it into typed configuration.
- A genuinely workspace/shared-infrastructure variable may remain unqualified only while its ownership is unambiguous.
- Once multiple services could use the same generic name with different values, service-owned variables MUST use an owning-service prefix, for example `DOCUMENTS_*` or `API_*`.
- Application and domain code MUST NOT read `process.env` directly.

The current unqualified `DB_*` variables are the existing API/local-database setup. Their final service-specific naming and database topology are intentionally deferred to issue #47.

## Execution environments

### Local Nx commands

Run repository tasks through Nx from the workspace root. Nx supplies the root workspace environment to the target process. This applies to normal `serve`, `start`, `test`, and migration targets.

Do not add `dotenv` loading inside application entry points, TypeORM data sources, test helpers, or migration code to compensate for bypassing the canonical Nx command path.

### Migration CLI

TypeORM data sources consume already-populated `process.env` and validate the required values through the same service-owned environment schema used by runtime configuration.

The canonical migration entry point is the service Nx migration target. Directly invoking a package script is an internal implementation detail; when it is invoked outside Nx, the caller is responsible for supplying the required environment explicitly.

### Docker Compose

Root Docker Compose may consume the root local environment for developer infrastructure. Compose variables configure the local infrastructure process; they do not authorize application code to load `.env` files itself.

### Tests

Tests executed through Nx receive environment using the same workspace task mechanism. Focused tests SHOULD set only the variables required by the behavior they own and MUST NOT depend on machine-specific env files.

### CI and deployment

CI, containers, and production/deployment systems inject environment variables externally. They MUST NOT depend on a repository `.env` file being present.

## Adding a new variable

Before adding an environment variable:

1. identify its owning service or genuinely shared infrastructure boundary;
2. choose an owner-qualified name when another service could need an independent value;
3. add safe local documentation to the root `.env.example` when developers need the variable locally;
4. validate it at the owning service configuration boundary;
5. inject the real value through CI/deployment environment configuration;
6. do not add a new env-loading mechanism.

Typed internal service configuration structure and injection conventions are defined by issue #46. Database ownership, service-specific database variable naming, and migration topology are defined by issue #47.