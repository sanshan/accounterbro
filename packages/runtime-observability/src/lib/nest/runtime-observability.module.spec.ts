import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { RuntimeObservabilityModule } from './runtime-observability.module.js';

describe('RuntimeObservabilityModule', () => {
    it('composes the shared Nest/Pino logger', async () => {
        const testingModule = await Test.createTestingModule({
            imports: [
                RuntimeObservabilityModule.register({
                    service: {
                        name: 'test-service',
                        version: '1.0.0',
                        environment: 'test',
                    },
                }),
            ],
        }).compile();

        expect(testingModule.get(PinoLogger)).toBeDefined();

        await testingModule.close();
    });
});
