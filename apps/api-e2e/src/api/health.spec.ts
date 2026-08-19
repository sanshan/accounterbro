import axios from 'axios';

describe('Health API', () => {
    it('reports the API process as live', async () => {
        const response = await axios.get('/api/health/live');

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
            status: 'ok',
            info: {},
            error: {},
            details: {},
        });
    });

    it('reports the API as ready when PostgreSQL is available', async () => {
        const response = await axios.get('/api/health/ready');

        expect(response.status).toBe(200);
        expect(response.data.status).toBe('ok');
        expect(response.data.info.database).toEqual({ status: 'up' });
        expect(response.data.details.database).toEqual({ status: 'up' });
    });
});
