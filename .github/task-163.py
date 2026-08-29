from pathlib import Path

root = Path('packages/runtime-executions/src')

files = {
    root / 'lib/runner/runner.ts': """import type { Runner as EdpRunner } from '@event-driven-platform/runner';

export abstract class Runner implements EdpRunner {
    public abstract execute: EdpRunner['execute'];
    public abstract executeDetailed: EdpRunner['executeDetailed'];
}
""",
    root / 'lib/reader/reader.ts': """import type { Reader as EdpReader } from '@event-driven-platform/reader';

export abstract class Reader implements EdpReader {
    public abstract execute: EdpReader['execute'];
}
""",
    root / 'lib/use-case-executor/use-case-executor.ts': """import type { UseCaseExecutor as EdpUseCaseExecutor } from '@event-driven-platform/use-case-executor';

export abstract class UseCaseExecutor implements EdpUseCaseExecutor {
    public abstract execute: EdpUseCaseExecutor['execute'];
}
""",
    root / 'lib/execution-log/execution-log-store.ts': """import type { ExecutionLogStore as EdpExecutionLogStore } from '@event-driven-platform/execution-log-store';

export abstract class ExecutionLogStore implements EdpExecutionLogStore {
    public abstract claim: EdpExecutionLogStore['claim'];
    public abstract complete: EdpExecutionLogStore['complete'];
    public abstract fail: EdpExecutionLogStore['fail'];
    public abstract findByIntentId: EdpExecutionLogStore['findByIntentId'];
}
""",
    root / 'lib/outbox/outbox-store.ts': """import type { OutboxStore as EdpOutboxStore } from '@event-driven-platform/outbox-store';

export abstract class OutboxStore implements EdpOutboxStore {
    public abstract append: EdpOutboxStore['append'];
}
""",
    root / 'lib/use-case-execution/use-case-execution-store.ts': """import type { UseCaseExecutionStore as EdpUseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';

export abstract class UseCaseExecutionStore implements EdpUseCaseExecutionStore {
    public abstract claim: EdpUseCaseExecutionStore['claim'];
    public abstract complete: EdpUseCaseExecutionStore['complete'];
    public abstract release: EdpUseCaseExecutionStore['release'];
}
""",
}
for path, content in files.items():
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def replace(path_str: str, old: str, new: str) -> None:
    path = Path(path_str)
    content = path.read_text()
    if old not in content:
        raise RuntimeError(f'Expected text not found in {path}: {old!r}')
    path.write_text(content.replace(old, new))


index = root / 'index.ts'
index.write_text(
    index.read_text()
    + "export { ExecutionLogStore } from './lib/execution-log/execution-log-store.js';\n"
    + "export { OutboxStore } from './lib/outbox/outbox-store.js';\n"
    + "export { Reader } from './lib/reader/reader.js';\n"
    + "export { Runner } from './lib/runner/runner.js';\n"
    + "export { UseCaseExecutionStore } from './lib/use-case-execution/use-case-execution-store.js';\n"
    + "export { UseCaseExecutor } from './lib/use-case-executor/use-case-executor.js';\n"
)

for entrypoint, export_line in [
    ('packages/runtime-executions/src/runner.ts', "export { Runner } from './lib/runner/runner.js';\n"),
    ('packages/runtime-executions/src/reader.ts', "export { Reader } from './lib/reader/reader.js';\n"),
    (
        'packages/runtime-executions/src/use-case-executor.ts',
        "export { UseCaseExecutor } from './lib/use-case-executor/use-case-executor.js';\n",
    ),
]:
    path = Path(entrypoint)
    path.write_text(export_line + path.read_text())

replace(
    'packages/runtime-executions/src/lib/runner/create-service-runner.ts',
    "import { createRunner, type Runner } from '@event-driven-platform/runner';\n\nimport type { CreateServiceRunnerOptions } from './create-service-runner-options.js';",
    "import { createRunner } from '@event-driven-platform/runner';\n\nimport type { CreateServiceRunnerOptions } from './create-service-runner-options.js';\nimport type { Runner } from './runner.js';",
)
replace(
    'packages/runtime-executions/src/lib/reader/create-service-reader.ts',
    "import { DefaultReader, type Reader } from '@event-driven-platform/reader';\n\nimport type { CreateServiceReaderOptions } from './create-service-reader-options.js';",
    "import { DefaultReader } from '@event-driven-platform/reader';\n\nimport type { CreateServiceReaderOptions } from './create-service-reader-options.js';\nimport type { Reader } from './reader.js';",
)
replace(
    'packages/runtime-executions/src/lib/use-case-executor/create-service-use-case-executor.ts',
    "import {\n    createUseCaseExecutor,\n    type UseCaseExecutor,\n} from '@event-driven-platform/use-case-executor';\n\nimport type { CreateServiceUseCaseExecutorOptions } from './create-service-use-case-executor-options.js';",
    "import { createUseCaseExecutor } from '@event-driven-platform/use-case-executor';\n\nimport type { CreateServiceUseCaseExecutorOptions } from './create-service-use-case-executor-options.js';\nimport type { UseCaseExecutor } from './use-case-executor.js';",
)

replace(
    'packages/runtime-executions/src/lib/runner/create-service-runner-options.ts',
    "import type { ExecutionLogStore } from '@event-driven-platform/execution-log-store';\nimport type { ExecutionTransaction } from '@event-driven-platform/execution-transaction';\nimport type { OutboxStore } from '@event-driven-platform/outbox-store';\n\nimport type { OperationHandlerResolver } from '../operation-handler-resolver/operation-handler-resolver.js';",
    "import type { ExecutionTransaction } from '@event-driven-platform/execution-transaction';\n\nimport type { ExecutionLogStore } from '../execution-log/execution-log-store.js';\nimport type { OperationHandlerResolver } from '../operation-handler-resolver/operation-handler-resolver.js';\nimport type { OutboxStore } from '../outbox/outbox-store.js';",
)
replace(
    'packages/runtime-executions/src/lib/use-case-executor/create-service-use-case-executor-options.ts',
    "import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';\n\nexport interface CreateServiceUseCaseExecutorOptions",
    "import type { UseCaseExecutionStore } from '../use-case-execution/use-case-execution-store.js';\n\nexport interface CreateServiceUseCaseExecutorOptions",
)

replace(
    'packages/runtime-executions/src/execution-log/typeorm.ts',
    "import type { ExecutionLogStore } from '@event-driven-platform/execution-log-store';\nimport type { DataSource } from 'typeorm';",
    "import type { DataSource } from 'typeorm';\n\nimport type { ExecutionLogStore } from '../lib/execution-log/execution-log-store.js';",
)
replace(
    'packages/runtime-executions/src/outbox/typeorm.ts',
    "import type { OutboxStore } from '@event-driven-platform/outbox-store';\nimport type { DataSource } from 'typeorm';",
    "import type { DataSource } from 'typeorm';\n\nimport type { OutboxStore } from '../lib/outbox/outbox-store.js';",
)
replace(
    'packages/runtime-executions/src/use-case-execution/typeorm.ts',
    "import type { UseCaseExecutionStore } from '@event-driven-platform/use-case-execution-store';\nimport type { DataSource } from 'typeorm';",
    "import type { DataSource } from 'typeorm';\n\nimport type { UseCaseExecutionStore } from '../lib/use-case-execution/use-case-execution-store.js';",
)
