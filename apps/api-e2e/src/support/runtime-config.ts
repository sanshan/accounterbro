import { runtimeConfig } from '@application-template/runtime-config';
import { z } from 'zod';

const HostSchema = z.string().min(1).default('localhost');

export function getApiE2eRuntimeConfig() {
    const host = HostSchema.parse(process.env.HOST);
    const { port } = runtimeConfig.api;

    return {
        host,
        port,
        baseUrl: `http://${host}:${port}`,
    };
}
