import { createRuntimeConfigModule } from './runtime-config-factory.cjs';

export const { PortSchema, runtimeConfig } = createRuntimeConfigModule(process.env);
