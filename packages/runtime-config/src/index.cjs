const { createRuntimeConfigModule } = require('./runtime-config-factory.cjs');

const { PortSchema, runtimeConfig } = createRuntimeConfigModule(process.env);

exports.PortSchema = PortSchema;
exports.runtimeConfig = runtimeConfig;
