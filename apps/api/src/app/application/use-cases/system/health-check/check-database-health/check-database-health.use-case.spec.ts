import type { DatabaseHealthProbe } from '../../../../../domain/system/health-check/database-health-probe';
import type { DatabaseHealthCheckPort } from '../../../../ports/database-health-check.port';
import { CheckDatabaseHealthUseCase } from './check-database-health.use-case';

describe('CheckDatabaseHealthUseCase', () => {
    let databaseHealthCheckPort: jest.Mocked<DatabaseHealthCheckPort>;
    let useCase: CheckDatabaseHealthUseCase;

    beforeEach(() => {
        databaseHealthCheckPort = {
            save: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
        };

        useCase = new CheckDatabaseHealthUseCase(databaseHealthCheckPort);
    });

    it('writes, reads, validates and cleans up the database probe', async () => {
        let savedProbe: DatabaseHealthProbe | undefined;

        databaseHealthCheckPort.save.mockImplementation(async (probe) => {
            savedProbe = probe;
        });
        databaseHealthCheckPort.findById.mockImplementation(async () => savedProbe ?? null);

        await useCase.execute();

        expect(savedProbe).toBeDefined();
        expect(savedProbe?.marker).toBe(`database-health-check:${savedProbe?.id}`);
        expect(databaseHealthCheckPort.save).toHaveBeenCalledTimes(1);
        expect(databaseHealthCheckPort.findById).toHaveBeenCalledWith(savedProbe?.id);
        expect(databaseHealthCheckPort.delete).toHaveBeenCalledWith(savedProbe?.id);
    });

    it('cleans up after a successful write when reading fails', async () => {
        let savedProbe: DatabaseHealthProbe | undefined;
        const readError = new Error('read failed');

        databaseHealthCheckPort.save.mockImplementation(async (probe) => {
            savedProbe = probe;
        });
        databaseHealthCheckPort.findById.mockRejectedValue(readError);

        await expect(useCase.execute()).rejects.toBe(readError);

        expect(databaseHealthCheckPort.delete).toHaveBeenCalledWith(savedProbe?.id);
    });

    it('cleans up after a successful write when validation fails', async () => {
        let savedProbe: DatabaseHealthProbe | undefined;

        databaseHealthCheckPort.save.mockImplementation(async (probe) => {
            savedProbe = probe;
        });
        databaseHealthCheckPort.findById.mockImplementation(async (id) => ({
            id,
            marker: 'unexpected-marker',
        }));

        await expect(useCase.execute()).rejects.toThrow('Database health probe validation failed');

        expect(databaseHealthCheckPort.delete).toHaveBeenCalledWith(savedProbe?.id);
    });

    it('does not attempt cleanup when writing fails', async () => {
        databaseHealthCheckPort.save.mockRejectedValue(new Error('write failed'));

        await expect(useCase.execute()).rejects.toThrow('write failed');

        expect(databaseHealthCheckPort.findById).not.toHaveBeenCalled();
        expect(databaseHealthCheckPort.delete).not.toHaveBeenCalled();
    });
});
