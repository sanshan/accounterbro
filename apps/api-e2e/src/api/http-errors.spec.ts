import axios from 'axios';

interface ProblemDetailsResponse {
    readonly type: string;
    readonly title: string;
    readonly status: number;
    readonly code: string;
    readonly traceId?: string;
}

describe('API HTTP errors', () => {
    it('renders an ordinary unknown route through the shared Problem Details filter', async () => {
        const response = await axios.get<ProblemDetailsResponse>('/api/not-found-integration-check', {
            validateStatus: () => true,
        });

        expect(response.status).toBe(404);
        expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
        expect(response.data).toMatchObject({
            type: 'urn:accounterbro:problem:not-found',
            title: 'Not Found',
            status: 404,
            code: 'not-found',
        });
        if (response.data.traceId !== undefined) {
            expect(response.data.traceId).toEqual(expect.any(String));
        }
        expect(response.data).not.toHaveProperty('stack');
        expect(response.data).not.toHaveProperty('cause');
    });
});
