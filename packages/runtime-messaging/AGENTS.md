# Runtime Messaging Agent Rules

These rules apply to `@accounterbro/runtime-messaging` in addition to the root `AGENTS.md` and `packages/AGENTS.md`.

## Responsibility

`@accounterbro/runtime-messaging` is the shared technical package for transport-neutral messaging ingress contracts and runtime composition owned by Epic #356.

At the #357 scaffold stage, the package intentionally exposes no messaging behavior. The root entrypoint remains framework-independent and must not eagerly depend on NestJS, business packages, service internals, or a broker SDK. Framework-specific composition belongs behind an explicit subpath only when a concrete implementation requires it.

Keep the package focused on cross-project messaging runtime responsibilities. Do not add broker delivery, retries, DLQ, wire serialization, business mappings, or service-specific behavior here.

## Verification

The Nx project name is `@accounterbro/runtime-messaging`.

For the scaffold, verify the supported targets:

```bash
pnpm nx run @accounterbro/runtime-messaging:lint
pnpm nx run @accounterbro/runtime-messaging:typecheck
pnpm nx run @accounterbro/runtime-messaging:build
```

There is no behavior test target in the scaffold. When runtime behavior is introduced, add focused tests at the boundary that owns that behavior and update these instructions to point to the proven implementation.
