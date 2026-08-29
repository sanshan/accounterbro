import json
from pathlib import Path

runtime_root = Path('packages/runtime-executions/src')
documents_root = Path('packages/documents/src')

(runtime_root / 'lib/runtime-package').mkdir(parents=True, exist_ok=True)
(runtime_root / 'lib/runtime-package/runtime-package.ts').write_text("""import type { DataSource, EntityTarget, MigrationInterface } from 'typeorm';

export interface RuntimeFactoryProvider {
    readonly provide: unknown;
    readonly inject: readonly unknown[];
    readonly useFactory: (...dependencies: never[]) => unknown;
}

export interface RuntimeExecutionContribution {
    readonly providers: readonly RuntimeFactoryProvider[];
    readonly operationBindingContainers?: readonly unknown[];
    readonly readBindingContainers?: readonly unknown[];
}

export interface RuntimeTypeOrmPersistenceContribution {
    readonly provide: unknown;
    readonly create: (dataSource: DataSource) => unknown;
}

export interface RuntimeTypeOrmContribution {
    readonly entities?: readonly EntityTarget<unknown>[];
    readonly migrations?: readonly (new () => MigrationInterface)[];
    readonly persistence?: readonly RuntimeTypeOrmPersistenceContribution[];
}

export interface RuntimePackageManifest {
    readonly execution?: RuntimeExecutionContribution;
    readonly typeorm?: RuntimeTypeOrmContribution;
}

export function defineRuntimePackage<const TPackage extends RuntimePackageManifest>(
    runtimePackage: TPackage,
): TPackage {
    return runtimePackage;
}

export interface RuntimePackageTypeOrmSchema {
    readonly entities: readonly EntityTarget<unknown>[];
    readonly migrations: readonly (new () => MigrationInterface)[];
}

export function collectRuntimePackageTypeOrmSchema(
    packages: readonly RuntimePackageManifest[],
): RuntimePackageTypeOrmSchema {
    return {
        entities: packages.flatMap((runtimePackage) => runtimePackage.typeorm?.entities ?? []),
        migrations: packages.flatMap((runtimePackage) => runtimePackage.typeorm?.migrations ?? []),
    };
}
""")

(runtime_root / 'lib/runtime-package/runtime-package.spec.ts').write_text("""import type { EntityTarget, MigrationInterface } from 'typeorm';

import { collectRuntimePackageTypeOrmSchema, defineRuntimePackage } from './runtime-package.js';

class FirstEntity {}
class SecondEntity {}

class FirstMigration implements MigrationInterface {
    public async up(): Promise<void> {}
    public async down(): Promise<void> {}
}

class SecondMigration implements MigrationInterface {
    public async up(): Promise<void> {}
    public async down(): Promise<void> {}
}

describe('runtime package TypeORM schema', () => {
    it('collects schema contributions from the hosted package list in registration order', () => {
        const first = defineRuntimePackage({
            typeorm: {
                entities: [FirstEntity] satisfies readonly EntityTarget<unknown>[],
                migrations: [FirstMigration],
            },
        });
        const withoutTypeOrm = defineRuntimePackage({});
        const second = defineRuntimePackage({
            typeorm: {
                entities: [SecondEntity] satisfies readonly EntityTarget<unknown>[],
                migrations: [SecondMigration],
            },
        });

        expect(collectRuntimePackageTypeOrmSchema([first, withoutTypeOrm, second])).toEqual({
            entities: [FirstEntity, SecondEntity],
            migrations: [FirstMigration, SecondMigration],
        });
    });
});
""")

index_path = runtime_root / 'index.ts'
index = index_path.read_text()
index += "export { collectRuntimePackageTypeOrmSchema, defineRuntimePackage } from './lib/runtime-package/runtime-package.js';\n"
index += "export type { RuntimeExecutionContribution, RuntimeFactoryProvider, RuntimePackageManifest, RuntimePackageTypeOrmSchema, RuntimeTypeOrmContribution, RuntimeTypeOrmPersistenceContribution } from './lib/runtime-package/runtime-package.js';\n"
index_path.write_text(index)

(documents_root / 'runtime.ts').write_text("""import { defineRuntimePackage } from '@accounterbro/runtime-executions';

import {
    DOCUMENTS_OPERATION_HANDLER_BINDINGS,
    DOCUMENTS_READ_HANDLER_BINDINGS,
    documentsOperationHandlerBindingsProvider,
    documentsOperationHandlerProviders,
    documentsReadHandlerBindingsProvider,
    documentsReadHandlerProviders,
} from './execution.js';
import {
    DOCUMENTS_TYPEORM_ENTITIES,
    DOCUMENTS_TYPEORM_MIGRATIONS,
    DocumentPersistence,
    createDocumentPersistence,
} from './typeorm.js';

export const documents = defineRuntimePackage({
    execution: {
        providers: [
            ...documentsOperationHandlerProviders,
            ...documentsReadHandlerProviders,
            documentsOperationHandlerBindingsProvider,
            documentsReadHandlerBindingsProvider,
        ],
        operationBindingContainers: [DOCUMENTS_OPERATION_HANDLER_BINDINGS],
        readBindingContainers: [DOCUMENTS_READ_HANDLER_BINDINGS],
    },
    typeorm: {
        entities: DOCUMENTS_TYPEORM_ENTITIES,
        migrations: DOCUMENTS_TYPEORM_MIGRATIONS,
        persistence: [
            {
                provide: DocumentPersistence,
                create: createDocumentPersistence,
            },
        ],
    },
});
""")

package_json_path = Path('packages/documents/package.json')
package_json = json.loads(package_json_path.read_text())
package_json['exports']['./runtime'] = {
    'types': './dist/runtime.d.ts',
    'import': './dist/runtime.js',
    'default': './dist/runtime.js',
}
package_json_path.write_text(json.dumps(package_json, indent=4) + '\n')
