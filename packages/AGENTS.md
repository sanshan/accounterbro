# Package Agent Rules

These rules apply under `packages/` in addition to the root workspace rules.

`docs/engineering/package-guidelines.md` is the canonical reusable guide for **business feature packages**. Apply it when changing a business package or the Core identity/reference contracts that business packages depend on. Do not apply business-package rules wholesale to technical capability packages merely because they also live under `packages/`.

Technical packages follow their nearest package-local `AGENTS.md` when one exists, plus only the engineering guides relevant to the concrete responsibility being changed.

## Proven business-feature reference

For a business feature package that owns domain state plus EDP Operations, Reads, handlers, and persistence, use `packages/documents` as the canonical working reference. Apply only the boundaries that the new feature actually needs; do not copy Documents-specific behavior mechanically.

The proven package boundary is:

- the root entrypoint exposes only business-facing contracts and runtime values required by consumers;
- `@accounterbro/<feature>/execution` owns package handler construction descriptors and Operation/Read binding groups while concrete handler wiring stays private;
- `@accounterbro/<feature>/typeorm` owns feature persistence composition contracts, entities, migrations, persistence tokens, and adapter factories while the hosting service owns the real `DataSource` lifecycle;
- package tests prove aggregate, handler, persistence, and composition contracts at the boundary that owns them rather than duplicating service-level behavioral specifications.

Use `apps/services/documents` as the paired reference for hosting such a package in a service: service UseCases orchestrate through EDP `Runner`/`Reader`, and service infrastructure composes package-owned `/execution` and `/typeorm` contracts instead of deep-importing package internals.

This reference does not turn technical capability packages such as `runtime-executions`, `runtime-presenters`, `object-storage`, `runtime-config`, or `core` into business feature packages. Keep their responsibility-specific boundaries and local instructions where present.
