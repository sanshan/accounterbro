import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loggerModuleForRoot } = vi.hoisted(() => ({
    loggerModuleForRoot: vi.fn(),
}));

vi.mock('nestjs-pino', async () => {
    const { Module } = await import('@nestjs/common');

    class MockLoggerModule {
        static forRoot(params: unknown) {
            loggerModuleForRoot(params);

            return { module: MockLoggerModule };
        }
    }

    Module({})(MockLoggerModule);

    return { LoggerModule: MockLoggerModule };
});

import { RuntimeObservabilityModule } from './runtime-observability.module.js';

describe('RuntimeObservabilityModule', () => {
    beforeEach(() => {
        loggerModuleForRoot.mockClear();
    });

    it('composes the Nest logger with the canonical Pino configuration and HTTP auto logging disabled', async () => {
        const moduleDefinition = RuntimeObservabilityModule.register({
            service: {
                name: 'test-service',
                version: '1.0.0',
                environment: 'test',
            },
        });
        const testingModule = await Test.createTestingModule({
            imports: [moduleDefinition],
        }).compile();

        expect(loggerModuleForRoot).toHaveBeenCalledOnce();
        expect(loggerModuleForRoot).toHaveBeenCalledWith({
            pinoHttp: expect.objectContaining({
                autoLogging: false,
                level: 'info',
                base: {
                    service: 'test-service',
                    serviceVersion: '1.0.0',
                    environment: 'test',
                },
            }),
        });

        await testingModule.close();
    });
});
