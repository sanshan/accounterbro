import { RuntimeNestLogger, RuntimePinoLogger } from '@accounterbro/runtime-observability/nest';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { apiConfig } from './app/infrastructure/config/api.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(RuntimeNestLogger));

  const config = app.get<ConfigType<typeof apiConfig>>(apiConfig.KEY);
  const logger = await app.resolve(RuntimePinoLogger);
  logger.setContext('ApiBootstrap');

  app.enableShutdownHooks();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  await app.listen(config.port);
  logger.info({ port: config.port, globalPrefix }, 'API service started');
}

void bootstrap();
