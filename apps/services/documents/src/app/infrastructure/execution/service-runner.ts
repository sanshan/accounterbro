import type { Runner } from '@accounterbro/runtime-executions';

type RunnerCommand = Parameters<Runner['execute']>[0];
type RunnerResult = Awaited<ReturnType<Runner['execute']>>;

export class ServiceRunner {
    public constructor(private readonly runner: Runner) {}

    public async execute(command: RunnerCommand): Promise<RunnerResult> {
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
