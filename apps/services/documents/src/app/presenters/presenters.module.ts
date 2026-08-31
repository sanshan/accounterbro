import { createTypeOrmDatabaseReadinessCheck } from '@accounterbro/runtime-health/typeorm';
import { httpRequestIdentityMiddleware } from '@accounterbro/runtime-presenters/http';
import { HttpErrorsModule } from '@accounterbro/runtime-presenters/http/errors/nest';
import { HttpHealthModule } from '@accounterbro/runtime-presenters/http/health';
import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ApplicationModule } from '../application/application.module';
import { DocumentsController } from './http/documents/documents.controller';

@Module({
    imports: [
        ApplicationModule,
        HttpErrorsModule,
        HttpHealthModule.register({
            imports: [ApplicationModule],
            readinessChecks: {
                inject: [DataSource],
                useFactory: (dataSource: DataSource) => [
                    createTypeOrmDatabaseReadinessCheck(dataSource),
                ],
            },
        }),
    ],
    controllers: [DocumentsController],
})
export class PresentersModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
        consumer.apply(httpRequestIdentityMiddleware).forRoutes(DocumentsController);
    }
}
