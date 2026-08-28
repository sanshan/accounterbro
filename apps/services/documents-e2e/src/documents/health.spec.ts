import axios from 'axios';

describe('Documents health', () => {
    it('reports liveness and database readiness without request identity', async () => {
        const live = await axios.get('/health/live');
        const ready = await axios.get('/health/ready');

        expect(live.status).toBe(200);
        expect(live.data.status).toBe('ok');
        expect(ready.status).toBe(200);
        expect(ready.data.status).toBe('ok');
        expect(ready.data.info.database).toEqual({ status: 'up' });
    });
});
