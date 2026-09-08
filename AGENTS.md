# Repository Agent Instructions

## Workspace Agent Rules

This repository uses scoped agent instructions.

- Read this root `AGENTS.md` before making repository changes.
- Before changing a file, read the nearest nested `AGENTS.md` in that file's directory tree.
- Nested `AGENTS.md` files add or narrow rules for their subtree and take precedence over this file when they conflict.
- Keep reusable engineering guidance with one owner. Nested agent files should prefer routing to canonical documentation over copying reusable rules.

## 1. Repository Purpose

AccounterBro is a monorepo for the AccounterBro platform. It contains frontend applications, backend services, shared packages, generators, specifications, engineering documentation, and supporting tooling.

The repository uses Nx and pnpm. Treat Nx project configuration and repository-owned documentation as the source of truth for project boundaries, commands, and conventions.

## 2. Required Discovery Before Changes

Before planning or implementing a change:

1. inspect the relevant current repository state;
2. read this file and every applicable nested `AGENTS.md`;
3. inspect the closest existing implementation for the same responsibility;
4. inspect canonical engineering or feature documentation for the affected area;
5. prefer the proven repository pattern over introducing a new abstraction.

Do not rely on stale chat history when the repository contains the authoritative state.

## 3. Workspace Commands

Use pnpm from the repository root.

Common commands:

```bash
pnpm install
pnpm nx show projects
pnpm nx graph
pnpm nx affected -t lint typecheck test build
```

Use project-specific Nx targets when only one project is affected.

Do not bypass Nx by inventing parallel ad-hoc scripts when an existing target owns the operation.

## 4. Nx Project Creation

When a task requires creating a new Nx app, library, or package, use the existing repository generator or the appropriate Nx generator.

Do not manually reproduce generator output.

After generation:

1. inspect the generated project configuration;
2. run the relevant Nx checks;
3. keep generated changes scoped to the task;
4. update canonical documentation only when the generated project establishes a reusable repository pattern.

## 5. Repository Boundaries

Respect established project and dependency boundaries.

- Applications compose packages; packages must not depend on application internals.
- Service/domain/application layers must follow the boundaries documented for their subtree.
- Shared runtime behavior belongs in shared packages rather than being reconstructed independently inside services.
- Generated or platform-owned contracts must be consumed through their published boundaries.
- Do not introduce cross-project imports merely to avoid adding an explicit public contract.

If an Nx boundary rule or canonical engineering guide already owns a restriction, follow it instead of duplicating the rule elsewhere.

## 6. Packages and Public APIs

Packages own reusable contracts and implementation intended for multiple consumers.

- Import through package public entrypoints when one exists.
- Do not depend on private source paths across package boundaries.
- Keep package exports intentional and minimal.
- Avoid broad barrel exports that expose implementation details without a consumer requirement.
- Preserve the repository's current build/runtime pattern for packages unless a task explicitly changes it.

## 7. Services

Service code must follow the nearest service-specific `AGENTS.md` and canonical service engineering guides.

As a general rule:

- presenters adapt external transport into application contracts;
- application/use-case code coordinates business work;
- domain code owns domain behavior and must not depend on infrastructure;
- infrastructure implements ports and external integration details;
- persistence remains tenant-aware wherever the model is tenant-owned;
- shared EDP/runtime execution behavior is consumed rather than reconstructed locally.

Do not mechanically propagate context such as tenant identity into every API. Determine whether the operation is tenant-scoped from the model and contract first.

## 8. Tests

Tests should prove behavior at the boundary that owns it.

- Unit tests belong with the implementation whose semantics they own.
- Service tests should prove service-owned wiring, mapping, configuration, integration, or observable behavior.
- Do not duplicate lower-level package/runtime behavior in service tests merely because it is easy to mock and assert.
- E2E tests should focus on externally observable contracts and meaningful integration boundaries.
- Prefer a small number of high-value tests over exhaustive duplication across layers.

When behavior is already deterministically enforced by lint, types, generation checks, or another owner, do not add redundant tests without a concrete gap.

## 9. Documentation Ownership

Repository documentation has explicit ownership.

- `AGENTS.md` files: scoped agent routing and local constraints.
- `docs/engineering/`: reusable engineering guidance and canonical implementation patterns.
- `specs/`: product/feature behavior and approved external contracts.
- package/service READMEs: local usage and implementation documentation.
- generator README: generator commands and generated-output contract.

Keep one canonical owner for reusable guidance. Prefer links from scoped files over copied paragraphs.

When implementation establishes a reusable canonical pattern, update the appropriate owner and reference the working implementation.

## 10. Dependency and Tooling Changes

Dependency changes must have a concrete task requirement.

- Prefer existing dependencies and tooling.
- Do not add a package for functionality already provided by the platform, standard library, or repository tooling.
- Keep lockfile changes consistent with manifest changes.
- Do not upgrade unrelated dependencies as incidental cleanup.
- For breaking dependency upgrades, fix affected code and tests in the same task unless the task explicitly stages the migration.

## 11. Local Development and Infrastructure

Use repository-owned Docker Compose, Nx targets, scripts, and documented local infrastructure paths.

Do not:

- assume globally installed tools, usernames, or local port ownership.

## 12. Change Discipline

Make the smallest coherent change that satisfies the requested behavior.

Before introducing a new pattern, search the repository for an existing implementation serving the same responsibility.

MUST NOT:

- refactor unrelated code;
- reorganize project structure merely to match personal preference;
- introduce generic abstractions without an immediate consumer;
- replace existing tooling without a concrete requirement;
- duplicate an existing repository capability;
- change multiple projects merely to make one project conform to a speculative design.

## 13. Required Verification

Run the smallest relevant Nx targets that prove the affected projects are healthy.

Typical project checks are:

```bash
pnpm nx run <project>:lint
pnpm nx run <project>:typecheck
pnpm nx run <project>:test
pnpm nx run <project>:build
```

For multi-project changes, prefer Nx orchestration:

```bash
pnpm nx run-many -t lint typecheck test build
```

Nested `AGENTS.md` files may require additional checks. Those checks are mandatory for changes in their scope.

MUST NOT declare work complete with known failing relevant tests, type/build errors, broken Nx project discovery, unresolved plugin errors, or an inconsistent lockfile.

If a required check cannot be run, state exactly which check was not run and why.

## Code Review Rules

For code-changing pull requests and pull requests that change repository review policy or routing under `docs/review/` or this section, read `docs/review/README.md` and follow its reviewer procedure using the applicable active rules under `docs/review/rules/`.
