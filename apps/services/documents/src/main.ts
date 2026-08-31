import 'reflect-metadata';
import { RuntimeNestLogger, RuntimePinoLogger } from '@accounterbro/runtime-observability/nest';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { documentsConfig } from './app/infrastructure/config/documents.config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(RuntimeNestLogger));

    const config = app.get<ConfigType<typeof documentsConfig>>(documentsConfig.KEY);
    const logger = await app.resolve(RuntimePinoLogger);
    logger.setContext('DocumentsBootstrap');

    app.enableShutdownHooks();

    await app.listen(config.port);
    logger.info({ port: config.port }, 'Documents service started');
}

void bootstrap();
