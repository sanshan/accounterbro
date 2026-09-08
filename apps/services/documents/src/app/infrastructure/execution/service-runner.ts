import type { Runner } from '@accounterbro/runtime-executions';
import type { Command } from '@event-driven-platform/command';
import type { AnyOperation, OperationResultOf } from '@event-driven-platform/operation';

export class ServiceRunner {
    public constructor(private readonly runner: Runner) {}

    public async execute<TOperation extends AnyOperation>(
        command: Command<TOperation>,
    ): Promise<OperationResultOf<TOperation>> {
        let lastError: unknown;

        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await this.runner.execute(command);
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError;
    }
}
