import { Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { apiConfig } from './app/infrastructure/config/api.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigType<typeof apiConfig>>(apiConfig.KEY);

  app.enableShutdownHooks();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  await app.listen(config.port);
  Logger.log(`Application is running on: http://localhost:${config.port}/${globalPrefix}`);
}

void bootstrap();
