import type { z } from 'zod';

export function createRuntimeConfigModule(env: NodeJS.ProcessEnv): Readonly<{
    PortSchema: z.ZodCoercedNumber<unknown>;
    runtimeConfig: Readonly<{
        api: Readonly<{ port: number }>;
        documents: Readonly<{ port: number }>;
        web: Readonly<{ port: number }>;
    }>;
}>;
