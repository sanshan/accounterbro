import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { documentsConfig } from './app/infrastructure/config/documents.config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = app.get<ConfigType<typeof documentsConfig>>(documentsConfig.KEY);

    app.enableShutdownHooks();

    await app.listen(config.port);
    Logger.log(`Documents service is running on: http://localhost:${config.port}`);
}

void bootstrap();
