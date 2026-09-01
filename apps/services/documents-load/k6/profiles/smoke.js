import { registerThenGetDocument } from '../scenario.js';
import { documentsSummary, summaryTrendStats } from '../summary.js';

export const options = {
    scenarios: {
        documents_smoke: {
            executor: 'shared-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '30s',
            tags: { profile: 'smoke' },
        },
    },
    summaryTrendStats,
    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate==0'],
    },
};

export default registerThenGetDocument;
export const handleSummary = documentsSummary;
