import { Module, type DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Options as PinoHttpOptions } from 'pino-http';

import {
    createRuntimePinoOptions,
    type RuntimeLoggerOptions,
} from '../runtime-pino-options.js';

@Module({})
export class RuntimeObservabilityModule {
    static register(options: RuntimeLoggerOptions): DynamicModule {
        const pinoHttp: PinoHttpOptions = {
            ...createRuntimePinoOptions(options),
            autoLogging: false,
        };

        return {
            module: RuntimeObservabilityModule,
            imports: [LoggerModule.forRoot({ pinoHttp })],
            exports: [LoggerModule],
        };
    }
}
