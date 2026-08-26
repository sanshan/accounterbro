# AccounterBro generators

`@accounterbro/generators` contains the repository-owned Nx generators for proven AccounterBro project shapes.

## Available generators

Create a business package:

```bash
pnpm nx g @accounterbro/generators:package <name>
```

Create an internal service:

```bash
pnpm nx g @accounterbro/generators:service <name>
```

Create the HTTP E2E project for an existing internal service:

```bash
pnpm nx g @accounterbro/generators:service-e2e <name>
```

Generator output is a repository baseline, not permission to invent unused architecture. Follow the root and applicable nested `AGENTS.md` plus the engineering guide for the responsibility being generated.

## Verification

Use the generator project's Nx targets from the repository root:

```bash
pnpm nx run @accounterbro/generators:lint
pnpm nx run @accounterbro/generators:typecheck
pnpm nx run @accounterbro/generators:test
pnpm nx run @accounterbro/generators:build
```
