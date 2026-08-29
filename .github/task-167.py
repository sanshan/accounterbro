from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f'Expected text not found in {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))

# packages/runtime-executions/AGENTS.md
path = 'packages/runtime-executions/AGENTS.md'
replace_once(
    path,
    'Keep runtime composition framework-agnostic unless a concrete task explicitly requires a framework boundary. Shared runtime code MUST NOT become Documents-specific or another business-domain implementation.',
    'The root `@accounterbro/runtime-executions` API remains framework-agnostic. Framework-specific composition MUST live behind an explicit integration subpath; the canonical Nest adapter is `@accounterbro/runtime-executions/nest`. Shared runtime code MUST NOT become Documents-specific or another business-domain implementation.',
)
replace_once(
    path,
    '- business packages own their Operation-name-to-handler binding groups and expose them from their Nest-agnostic `/execution` entrypoint;\n- each service composes one `OperationHandlerResolver` from the binding groups of the business packages it hosts;',
    '- business packages own their Operation-name-to-handler binding groups and expose them as framework-agnostic composition data;\n- the package runtime manifest includes the package binding-container identity; `@accounterbro/runtime-executions/nest` aggregates the containers of all hosted manifests into one `OperationHandlerResolver`;\n- hosting services select package manifests and MUST NOT reconstruct resolver wiring;',
)
replace_once(
    path,
    '- business packages own their Read-name-to-handler binding groups and expose them from their Nest-agnostic `/execution` entrypoint;\n- each service composes one `ReadHandlerResolver` from the binding groups of the business packages it hosts;',
    '- business packages own their Read-name-to-handler binding groups and expose them as framework-agnostic composition data;\n- the package runtime manifest includes the package binding-container identity; `@accounterbro/runtime-executions/nest` aggregates the containers of all hosted manifests into one `ReadHandlerResolver`;\n- hosting services select package manifests and MUST NOT reconstruct resolver wiring;',
)
replace_once(
    path,
    '## TypeORM execution transactions',
    '''## Runtime package manifests and Nest composition\n\nThe canonical host-facing package contract is the framework-agnostic `RuntimePackageManifest`, created with `defineRuntimePackage(...)`. `packages/documents/src/runtime.ts` is the working reference.\n\n- a business package manifest describes the execution and TypeORM contributions required to host that package; it MUST NOT initialize infrastructure or import NestJS;\n- package-specific `/execution` and `/typeorm` entrypoints may remain the owners of focused implementation contracts, while `/runtime` aggregates those contracts for standard hosting;\n- `@accounterbro/runtime-executions/nest` interprets manifests and owns the standard Nest provider graph for Runner, Reader, UseCaseExecutor, resolvers, transaction propagation, and durable runtime stores;\n- ordinary single-value DI identities MUST be runtime-valued classes or abstract classes. Do not introduce service-specific Symbol tokens for Runner, Reader, UseCaseExecutor, runtime stores, or other ordinary dependencies;\n- Symbol tokens are an explicit exception for container/multibinding semantics such as package Operation/Read binding collections. They are composition details carried by the manifest and MUST NOT leak into application or presenter injection;\n- the hosting service owns the real Nest-managed TypeORM `DataSource` lifecycle/configuration and service-specific external integrations. The Nest adapter composes around that `DataSource`; it MUST NOT initialize or destroy it.\n\nThe canonical service reference is `apps/services/documents/src/app/infrastructure/infrastructure.module.ts`, which hosts Documents with `RuntimeExecutionsModule.register([documents])`.\n\n## TypeORM execution transactions''',
)
replace_once(
    path,
    '- the process-level `ExecutionLeaseOwnerId` is supplied by the hosting service and identifies one running process/replica, not a stable logical service name;',
    '- `createServiceRunner(...)` accepts the process-level `ExecutionLeaseOwnerId` as a framework-agnostic composition input; the canonical Nest adapter owns creation of one process identity shared by Runner and UseCaseExecutor for the running replica;',
)

# packages/AGENTS.md
path = 'packages/AGENTS.md'
replace_once(
    path,
    '''The proven package boundary is:\n\n- the root entrypoint exposes only business-facing contracts and runtime values required by consumers;\n- `@accounterbro/<feature>/execution` owns package handler construction descriptors and Operation/Read binding groups while concrete handler wiring stays private;\n- `@accounterbro/<feature>/typeorm` owns feature persistence composition contracts, entities, migrations, persistence tokens, and adapter factories while the hosting service owns the real `DataSource` lifecycle;\n- package tests prove aggregate, handler, persistence, and composition contracts at the boundary that owns them rather than duplicating service-level behavioral specifications.\n\nUse `apps/services/documents` as the paired reference for hosting such a package in a service: service UseCases orchestrate through EDP `Runner`/`Reader`, and service infrastructure composes package-owned `/execution` and `/typeorm` contracts instead of deep-importing package internals.''',
    '''The proven package boundary is:\n\n- the root entrypoint exposes only business-facing contracts and runtime values required by consumers;\n- `@accounterbro/<feature>/execution` owns package handler construction descriptors and Operation/Read binding groups while concrete handler wiring stays private;\n- `@accounterbro/<feature>/typeorm` owns feature persistence composition contracts, entities, migrations, persistence tokens, and adapter factories while the hosting service owns the real `DataSource` lifecycle;\n- `@accounterbro/<feature>/runtime` exposes one framework-agnostic runtime manifest that aggregates the package's hosting contributions without duplicating their implementation knowledge;\n- package tests prove aggregate, handler, persistence, and composition contracts at the boundary that owns them rather than duplicating service-level behavioral specifications.\n\nUse `packages/documents/src/runtime.ts` as the manifest reference and `apps/services/documents` as the paired host reference. Standard Nest hosting registers package manifests through `@accounterbro/runtime-executions/nest`; the service chooses hosted packages and does not recreate package execution/persistence provider wiring.''',
)

# docs/engineering/package-guidelines.md
path = 'docs/engineering/package-guidelines.md'
replace_once(
    path,
    '## Events',
    '''## Runtime manifest\n\n- **RUNTIME-001** — A business package that participates in the standard execution runtime MUST expose one Nest-agnostic host manifest from `@accounterbro/<package>/runtime`.\n- **RUNTIME-002** — The manifest MUST be created through the `RuntimePackageManifest`/`defineRuntimePackage(...)` contract from `@accounterbro/runtime-executions`; `@accounterbro/documents/runtime` is the canonical working reference.\n- **RUNTIME-003** — The runtime manifest aggregates package-owned execution and TypeORM contributions. It MUST NOT duplicate concrete handler, mapper, repository, entity, migration, or adapter construction knowledge already owned by the package's focused boundaries.\n- **RUNTIME-004** — The runtime manifest MUST remain framework-agnostic and MUST NOT import NestJS provider/module types.\n- **RUNTIME-005** — Operation/Read binding container tokens MAY be carried by the manifest because they represent collection/multibinding semantics. They MUST NOT be used as ordinary application DI identities.\n- **RUNTIME-006** — A standard Nest hosting service MUST register package manifests through `@accounterbro/runtime-executions/nest` rather than manually consuming the package's individual execution provider/binding and persistence-factory descriptors.\n\n## Events''',
)
replace_once(
    path,
    '- **DB-016** — Package TypeORM factories MUST remain Nest-agnostic. They MUST NOT import Nest provider types or decorators; the hosting service owns Nest provider descriptors and injects its service-owned `DataSource` into the package factory.',
    '- **DB-016** — Package TypeORM factories MUST remain Nest-agnostic. They MUST NOT import Nest provider types or decorators; the standard `@accounterbro/runtime-executions/nest` adapter owns Nest provider wiring for persistence contributions declared by hosted runtime manifests.',
)
replace_once(
    path,
    '- **DB-018** — Transaction participation for package persistence is a hosting-runtime concern. A service that needs EDP execution transactions MUST supply the shared transaction-aware `DataSource` from `@accounterbro/runtime-executions/typeorm` to the unchanged package factory instead of adding transaction plumbing to the business package.',
    '- **DB-018** — Transaction participation for package persistence is a hosting-runtime concern. Under the standard Nest composition, `@accounterbro/runtime-executions/nest` supplies the shared transaction-aware `DataSource` to unchanged package factories declared by hosted manifests; the business package remains unaware of transaction plumbing.',
)

# docs/engineering/service-guidelines.md
path = 'docs/engineering/service-guidelines.md'
replace_once(
    path,
    'When a service hosts a business package, consume the package\'s public integration entrypoints such as `@accounterbro/<package>/execution` and `@accounterbro/<package>/typeorm`. Do not deep-import package implementation files or reconstruct package-owned handler/persistence construction in the service.',
    'When a service hosts a business package through the standard execution runtime, consume its `@accounterbro/<package>/runtime` manifest through `@accounterbro/runtime-executions/nest`. Do not deep-import package implementation files, manually consume its individual execution/persistence descriptors, or reconstruct package-owned handler/persistence construction in the service.',
)
replace_once(
    path,
    'The service owns its Nest/process composition and concrete service inputs. `@accounterbro/runtime-executions` owns the reusable AccounterBro composition choices around published EDP contracts, while EDP remains the source of truth for execution semantics.',
    'The service owns the hosted-package selection, real `DataSource` lifecycle/configuration, and service-specific external integrations. The framework-agnostic `@accounterbro/runtime-executions` core owns reusable AccounterBro contracts/factories, while `@accounterbro/runtime-executions/nest` owns the standard Nest/process provider graph around the service-owned `DataSource`. EDP remains the source of truth for execution semantics.',
)
replace_once(
    path,
    '## Business package hosting\n\nA business package owns its business model, Operations/Reads/handlers, and package persistence integration contracts. A hosting service owns process/runtime composition around those public contracts.\n\nThe service MAY register package-exported provider/binding groups and package TypeORM contributions required by the behavior it hosts. It MUST NOT deep-import concrete package handlers/entities/migrations/adapters or duplicate package-owned construction/mapping knowledge.\n\nUse `packages/documents` together with `apps/services/documents` as the current paired reference for this boundary. Apply only the parts required by the service being changed.',
    '''## Business package hosting\n\nA business package owns its business model, Operations/Reads/handlers, persistence integration contracts, and one framework-agnostic runtime manifest aggregating the contributions required for standard hosting.\n\nA Nest service selects the packages it hosts and registers their manifests through the shared adapter:\n\n```ts\nRuntimeExecutionsModule.register([documents]);\n```\n\nThe service MUST NOT add local execution/read wrapper modules, package provider files, or service-specific Runner/Reader/UseCaseExecutor tokens merely to reproduce the shared graph. Ordinary runtime dependencies are injected through the runtime-valued class/abstract-class identities exported by `@accounterbro/runtime-executions`. Symbol tokens are reserved for genuine container/multibinding composition and stay behind the manifest/runtime boundary.\n\nThe service remains responsible for its real `DataSource` lifecycle/configuration and service-specific external integrations such as ObjectStorage. It MUST NOT deep-import concrete package handlers/entities/migrations/adapters or duplicate package-owned construction/mapping knowledge.\n\nUse `packages/documents/src/runtime.ts` together with `apps/services/documents/src/app/infrastructure/infrastructure.module.ts` as the current paired reference for this boundary.''',
)

# docs/engineering/database-guidelines.md
path = 'docs/engineering/database-guidelines.md'
replace_once(
    path,
    'Feature persistence registration uses `TypeOrmModule.forFeature(...)`. When a hosted business package owns TypeORM persistence, the service registers the package contribution exposed from `@accounterbro/<package>/typeorm`; it does not import the package\'s private entity files.',
    'Feature persistence registration still uses Nest/TypeORM mechanisms, but standard business-package contributions are registered by `@accounterbro/runtime-executions/nest` from hosted package manifests. The service does not import package-private entity files or create package persistence provider wrappers.',
)
start = '''The hosting service owns Nest provider wiring. Provider definitions are grouped by business package inside the service TypeORM boundary:\n\n```text\ninfrastructure/persistence/typeorm/\n├── <service>-typeorm.module.ts\n├── typeorm-options.ts\n├── data-source.ts\n├── providers/\n│   ├── documents/\n│   │   └── documents.providers.ts\n│   └── <package>/\n│       └── <package>.providers.ts\n└── migrations/                 # only genuinely service-owned schema artifacts\n```\n\nA service-side package provider is composition only: bind the package-exported runtime port token to the package-exported factory and inject the service-owned `DataSource` boundary. The service MUST NOT reconstruct the package adapter, import private entities, or duplicate package persistence-construction knowledge.'''
replace_once(
    path,
    start,
    '''The package `/typeorm` entrypoint remains the owner of framework-agnostic entities, migrations, persistence ports, and adapter factories. Its `@accounterbro/<package>/runtime` manifest aggregates the TypeORM contribution for standard hosting.\n\n`@accounterbro/runtime-executions/nest` owns the standard Nest provider wiring: it registers manifested package entities, binds manifested persistence factories, and supplies the transaction-aware `DataSource` where required. The service MUST NOT add package-grouped provider wrapper files for this standard path. The real `DataSource` itself remains service-owned.''',
)
replace_once(
    path,
    '''infrastructure/persistence/typeorm/\n├── <service>-typeorm.module.ts\n├── typeorm-options.ts\n├── data-source.ts\n├── providers/                  # package-grouped TypeORM persistence bindings when needed\n└── migrations/                 # only service-owned schema artifacts when needed''',
    '''infrastructure/persistence/typeorm/\n├── <service>-typeorm.module.ts\n├── typeorm-options.ts\n├── data-source.ts\n└── migrations/                 # only service-owned schema artifacts when needed''',
)
replace_once(
    path,
    'Register package-owned persistence entities through their public composition contracts and register package persistence providers from package-grouped provider files. A service hosting multiple business packages composes each package\'s required contracts into the same service-owned database runtime.',
    'For the standard execution path, package-owned persistence entities/providers are composed from hosted runtime manifests by `RuntimeExecutionsModule.register([...packages])`. The service TypeORM module retains `TypeOrmModule.forRootAsync(...)` and any service-owned or unrelated capability registration, but does not recreate the shared execution persistence graph.',
)
replace_once(
    path,
    '- supply the runtime-provided transaction-aware `DataSource` to unchanged business-package persistence factories and shared runtime stores that must participate in the Operation transaction;',
    '- let `@accounterbro/runtime-executions/nest` supply the transaction-aware `DataSource` to manifested business-package persistence factories and shared runtime stores that must participate in the Operation transaction;',
)
replace_once(
    path,
    'Consume the stores and their exported entity/migration composition contracts through those public entrypoints. Keep execution-log and Outbox state in the owning service database rather than creating a central database or service-local copies of the adapters/schemas.\n\nWhen the runtime path requires participation in the active Operation transaction, bind these stores to the same transaction-aware `DataSource` boundary used by business persistence.',
    'The standard Nest adapter composes these stores and their runtime entities around the service-owned database. Keep execution-log and Outbox state in that database rather than creating a central database or service-local copies of the adapters/schemas.\n\nWhen the runtime path requires participation in the active Operation transaction, the adapter binds these stores to the same transaction-aware `DataSource` boundary used by business persistence.',
)
replace_once(
    path,
    'Compose its exported entity/migration contracts into the service database and construct its store from the real service-owned `DataSource` as required by its public factory.',
    'Under the standard Nest runtime, `@accounterbro/runtime-executions/nest` composes its entity/store around the real service-owned `DataSource`; services do not construct a service-local store provider.',
)
replace_once(
    path,
    'When a business service hosts a TypeORM-backed business package, extend the service-owned shell by composing package-owned contracts from `@accounterbro/<package>/typeorm`; do not use API\'s service-owned schema layout as a reason to move package artifacts into the service.',
    'When a business service hosts a TypeORM-backed business package through the standard runtime, register its `@accounterbro/<package>/runtime` manifest and let `@accounterbro/runtime-executions/nest` compose runtime persistence around the service-owned `DataSource`; do not move package artifacts into the service.',
)
replace_once(
    path,
    'Adding a package to a generated service is a composition step: consume that package\'s public TypeORM contracts/factories rather than modifying the generator to copy package persistence artifacts.',
    'Adding a standard runtime package to a generated service is a composition step performed after generation: register its runtime manifest rather than modifying the generator to copy package persistence artifacts or execution wiring.',
)
# CLI guidance: one package list/manifest source
replace_once(
    path,
    '- compose explicit entities and migrations for all schema hosted by that service, using public contracts from the owning business/runtime packages plus any genuinely service-owned artifacts;',
    '- compose explicit entities and migrations for all schema hosted by that service; for business packages use `collectRuntimePackageTypeOrmSchema(hostedPackages)` from the same hosted manifest list where practical, plus public contracts for other runtime capabilities and genuinely service-owned artifacts;',
)

# apps/services/AGENTS.md
path = 'apps/services/AGENTS.md'
replace_once(
    path,
    '## Shared execution runtime\n\nFor service-side Runner, Reader, UseCaseExecutor, resolver, transaction, execution-log, Outbox, and durable UseCase execution consumption, follow `docs/engineering/service-guidelines.md` and, for TypeORM persistence composition, `docs/engineering/database-guidelines.md`.\n\nImplementation-local invariants for changing `@accounterbro/runtime-executions` itself remain in `packages/runtime-executions/AGENTS.md`; do not copy them into a service.',
    '''## Shared execution runtime\n\nFor service-side Runner, Reader, UseCaseExecutor, resolver, transaction, execution-log, Outbox, and durable UseCase execution consumption, follow `docs/engineering/service-guidelines.md` and, for TypeORM persistence composition, `docs/engineering/database-guidelines.md`.\n\nThe canonical business-service host registers package manifests through `@accounterbro/runtime-executions/nest`:\n\n```ts\nRuntimeExecutionsModule.register([documents]);\n```\n\nA service chooses the hosted package list and keeps ownership of its real `DataSource` lifecycle/configuration and service-specific external integrations. It MUST NOT recreate the standard execution/read/store provider graph with local tokens, provider wrapper files, or local execution/read modules. Ordinary runtime dependencies use the runtime-valued class/abstract-class identities from `@accounterbro/runtime-executions`; container/multibinding tokens are the explicit internal exception.\n\nImplementation-local invariants for changing `@accounterbro/runtime-executions` itself remain in `packages/runtime-executions/AGENTS.md`; do not copy them into a service.''',
)
