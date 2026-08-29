from pathlib import Path

root = Path('apps/services/documents/src/app')

(root / 'application/application.module.ts').write_text("""import { Module } from '@nestjs/common';

import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { GetDocumentUseCase } from './use-cases/get-document.use-case';
import { RegisterDocumentUseCase } from './use-cases/register-document.use-case';

@Module({
    imports: [InfrastructureModule],
    providers: [RegisterDocumentUseCase, GetDocumentUseCase],
    exports: [InfrastructureModule, RegisterDocumentUseCase, GetDocumentUseCase],
})
export class ApplicationModule {}
""")

get_use_case = root / 'application/use-cases/get-document.use-case.ts'
text = get_use_case.read_text()
text = text.replace("import type { Reader } from '@event-driven-platform/reader';\n", "import { Reader } from '@accounterbro/runtime-executions';\n")
get_use_case.write_text(text)

register_use_case = root / 'application/use-cases/register-document.use-case.ts'
text = register_use_case.read_text()
text = text.replace("import type { ObjectStorage } from '@accounterbro/object-storage';\n", "import { ObjectStorage } from '@accounterbro/object-storage';\n")
text = text.replace("import type { Runner } from '@event-driven-platform/runner';\n", "import { Runner } from '@accounterbro/runtime-executions';\n")
register_use_case.write_text(text)

controller = root / 'presenters/http/documents/documents.controller.ts'
text = controller.read_text()
text = text.replace("import { Actor, Tenant } from '@accounterbro/runtime-presenters/http';\n", "import { Actor, Tenant } from '@accounterbro/runtime-presenters/http';\nimport { UseCaseExecutor } from '@accounterbro/runtime-executions';\n")
text = text.replace("import type { UseCaseExecutor } from '@event-driven-platform/use-case-executor';\n", "")
text = text.replace("    Inject,\n", "")
text = text.replace("import { DOCUMENTS_USE_CASE_EXECUTOR } from '../../../application/application.tokens';\n", "")
text = text.replace("        @Inject(DOCUMENTS_USE_CASE_EXECUTOR)\n        private readonly useCaseExecutor: UseCaseExecutor,\n", "        private readonly useCaseExecutor: UseCaseExecutor,\n")
controller.write_text(text)

(root / 'infrastructure/infrastructure.module.ts').write_text("""import { documents } from '@accounterbro/documents/runtime';
import { RuntimeExecutionsModule } from '@accounterbro/runtime-executions/nest';
import { Module } from '@nestjs/common';

import { DocumentsConfigModule } from './config/documents-config.module';
import { DocumentsTypeormModule } from './persistence/typeorm/documents-typeorm.module';
import { DocumentsObjectStorageModule } from './storage/documents-object-storage.module';

const documentsRuntimeModule = RuntimeExecutionsModule.register([documents]);

@Module({
    imports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        documentsRuntimeModule,
        DocumentsObjectStorageModule,
    ],
    exports: [
        DocumentsConfigModule,
        DocumentsTypeormModule,
        documentsRuntimeModule,
        DocumentsObjectStorageModule,
    ],
})
export class InfrastructureModule {}
""")

(root / 'infrastructure/persistence/typeorm/documents-typeorm.module.ts').write_text("""import { RUNTIME_HEALTH_TYPEORM_ENTITIES } from '@accounterbro/runtime-health/typeorm';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentsConfigModule } from '../../config/documents-config.module';
import { documentsConfig } from '../../config/documents.config';
import { createDocumentsTypeOrmOptions } from './typeorm-options';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [DocumentsConfigModule],
            inject: [documentsConfig.KEY],
            useFactory: (config: ConfigType<typeof documentsConfig>) => ({
                ...createDocumentsTypeOrmOptions(config.database),
                autoLoadEntities: true,
            }),
        }),
        TypeOrmModule.forFeature([...RUNTIME_HEALTH_TYPEORM_ENTITIES]),
    ],
    exports: [TypeOrmModule],
})
export class DocumentsTypeormModule {}
""")

(root / 'infrastructure/persistence/typeorm/data-source.ts').write_text("""import { documents } from '@accounterbro/documents/runtime';
import {
    RUNTIME_HEALTH_TYPEORM_ENTITIES,
    RUNTIME_HEALTH_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-health/typeorm';
import { collectRuntimePackageTypeOrmSchema } from '@accounterbro/runtime-executions';
import {
    EXECUTION_LOG_TYPEORM_ENTITIES,
    EXECUTION_LOG_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-executions/execution-log/typeorm';
import {
    OUTBOX_TYPEORM_ENTITIES,
    OUTBOX_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-executions/outbox/typeorm';
import {
    USE_CASE_EXECUTION_TYPEORM_ENTITIES,
    USE_CASE_EXECUTION_TYPEORM_MIGRATIONS,
} from '@accounterbro/runtime-executions/use-case-execution/typeorm';
import { DataSource } from 'typeorm';

import { createDocumentsConfig } from '../../config/documents.config';
import { createDocumentsTypeOrmOptions } from './typeorm-options';

const config = createDocumentsConfig();
const hostedPackages = [documents] as const;
const packageSchema = collectRuntimePackageTypeOrmSchema(hostedPackages);

export const AppDataSource = new DataSource({
    ...createDocumentsTypeOrmOptions(config.database),
    entities: [
        ...packageSchema.entities,
        ...RUNTIME_HEALTH_TYPEORM_ENTITIES,
        ...EXECUTION_LOG_TYPEORM_ENTITIES,
        ...OUTBOX_TYPEORM_ENTITIES,
        ...USE_CASE_EXECUTION_TYPEORM_ENTITIES,
    ],
    migrations: [
        ...packageSchema.migrations,
        ...RUNTIME_HEALTH_TYPEORM_MIGRATIONS,
        ...EXECUTION_LOG_TYPEORM_MIGRATIONS,
        ...OUTBOX_TYPEORM_MIGRATIONS,
        ...USE_CASE_EXECUTION_TYPEORM_MIGRATIONS,
        `${__dirname}/migrations/*{.ts,.js}`,
    ],
    migrationsRun: false,
});
""")

for relative in [
    'application/application.tokens.ts',
    'infrastructure/runtime/runtime.tokens.ts',
    'infrastructure/execution/documents-execution.module.ts',
    'infrastructure/execution/providers/documents/documents-operation-handlers.providers.ts',
    'infrastructure/read/documents-read.module.ts',
    'infrastructure/read/providers/documents/documents-read-handlers.providers.ts',
    'infrastructure/persistence/typeorm/providers/documents/documents.providers.ts',
]:
    path = root / relative
    if path.exists():
        path.unlink()
