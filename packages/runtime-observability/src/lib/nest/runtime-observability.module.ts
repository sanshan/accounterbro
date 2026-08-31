import { Module, type DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import {
    createRuntimePinoOptions,
    type RuntimeLoggerOptions,
} from '../runtime-pino-options.js';

@Module({})
export class RuntimeObservabilityModule {
    static register(options: RuntimeLoggerOptions): DynamicModule {
        return {
            module: RuntimeObservabilityModule,
            imports: [
                LoggerModule.forRoot({
                    pinoHttp: {
                        ...createRuntimePinoOptions(options),
                        autoLogging: false,
                    },
                }),
            ],
            exports: [LoggerModule],
        };
    }
}
