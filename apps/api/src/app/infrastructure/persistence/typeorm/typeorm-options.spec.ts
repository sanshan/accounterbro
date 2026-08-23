import { createApiTypeOrmOptions } from './typeorm-options';

describe('createApiTypeOrmOptions', () => {
    it('maps typed service database config to migration-safe TypeORM connection options', () => {
        expect(
            createApiTypeOrmOptions({
                host: 'database.internal',
                port: 5432,
                username: 'api',
                password: 'secret',
                name: 'api',
            }),
        ).toEqual({
            type: 'postgres',
            host: 'database.internal',
            port: 5432,
            username: 'api',
            password: 'secret',
            database: 'api',
            synchronize: false,
            logging: false,
        });
    });
});
