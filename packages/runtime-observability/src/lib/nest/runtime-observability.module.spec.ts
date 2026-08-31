import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';

import { RuntimeObservabilityModule } from './runtime-observability.module.js';

describe('RuntimeObservabilityModule', () => {
    it('provides the shared Nest Pino logger from one registration', async () => {
        const testingModule = await Test.createTestingModule({
            imports: [
                RuntimeObservabilityModule.register({
                    service: {
                        name: 'test-service',
                    },
                }),
            ],
        }).compile();

        expect(testingModule.get(Logger)).toBeInstanceOf(Logger);

        await testingModule.close();
    });
});
