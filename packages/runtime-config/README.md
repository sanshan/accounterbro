# runtime-config

`@accounterbro/runtime-config` owns runtime values that need one shared contract across applications and workspace tooling.

The package currently:

- validates `API_PORT`, `DOCUMENTS_PORT`, and `WEB_PORT` from the process environment;
- applies the repository defaults for those ports;
- exports the immutable `runtimeConfig` object used by runtime and tooling consumers;
- exports `PortSchema` for service-owned configuration that needs the same port primitive.

Environment loading and ownership rules are defined in `docs/engineering/environment-guidelines.md`. Service-specific typed Nest configuration is defined in `docs/engineering/service-configuration-guidelines.md`.
