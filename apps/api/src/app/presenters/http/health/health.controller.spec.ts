import { ShutdownSignal, type INestApplication } from '@nestjs/common';
import type { NestApplicationContext } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import request from 'supertest';

import { CheckDatabaseHealthUseCase } from '../../../application/use-cases/system/health-check/check-database-health/check-database-health.use-case';
import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
import { HealthController } from './health.controller';

describe('HealthController', () => {
    let app: INestApplication;
    let appClosed: boolean;
    let checkDatabaseHealthUseCase: { execute: jest.Mock<Promise<void>, []> };

    beforeEach(async () => {
        appClosed = false;
        checkDatabaseHealthUseCase = {
            execute: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            imports: [
                TerminusModule.forRoot({
                    gracefulShutdownTimeoutMs: 64,
                }),
            ],
            controllers: [HealthController],
            providers: [
                DatabaseHealthIndicator,
                {
                    provide: CheckDatabaseHealthUseCase,
                    useValue: checkDatabaseHealthUseCase,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        app.setGlobalPrefix('api');
        await app.init();
    });

    afterEach(async () => {
        if (!appClosed) {
            await app.close();
        }
    });

    it('returns a healthy liveness response without invoking database health', async () => {
        const response = await request(app.getHttpServer()).get('/api/health/live').expect(200);

        expect(response.body).toMatchObject({
            status: 'ok',
            info: {},
            error: {},
            details: {},
        });
        expect(checkDatabaseHealthUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns a healthy readiness response with a database indicator', async () => {
        checkDatabaseHealthUseCase.execute.mockResolvedValue();

        const response = await request(app.getHttpServer()).get('/api/health/ready').expect(200);

        expect(checkDatabaseHealthUseCase.execute).toHaveBeenCalledTimes(1);
        expect(response.body.status).toBe('ok');
        expect(response.body.info.database).toEqual({ status: 'up' });
        expect(response.body.details.database).toEqual({ status: 'up' });
    });

    it('returns a Terminus unhealthy response when database readiness fails', async () => {
        checkDatabaseHealthUseCase.execute.mockRejectedValue(new Error('sensitive database failure'));

        const response = await request(app.getHttpServer()).get('/api/health/ready').expect(503);

        expect(response.body.status).toBe('error');
        expect(response.body.error.database).toEqual({ status: 'down' });
        expect(response.body.details.database).toEqual({ status: 'down' });
        expect(JSON.stringify(response.body)).not.toContain('sensitive database failure');
    });

    it('reports readiness as shutting down while the graceful shutdown delay is active', async () => {
        checkDatabaseHealthUseCase.execute.mockResolvedValue();

        const closePromise = (app.close as NestApplicationContext['close'])(ShutdownSignal.SIGTERM);

        await new Promise((resolve) => setTimeout(resolve, 16));

        const response = await request(app.getHttpServer()).get('/api/health/ready').expect(503);

        expect(response.body.status).toBe('shutting_down');

        await closePromise;
        appClosed = true;
    });
});
