import { registerThenGetDocument } from '../scenario.js';
import { documentsSummary, summaryTrendStats } from '../summary.js';

export const options = {
    scenarios: {
        documents_baseline: {
            executor: 'ramping-arrival-rate',
            startRate: 1,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 50,
            stages: [
                { duration: '15s', target: 5 },
                { duration: '30s', target: 5 },
                { duration: '15s', target: 0 },
            ],
            tags: { profile: 'baseline' },
        },
    },
    summaryTrendStats,
};

export default registerThenGetDocument;
export const handleSummary = documentsSummary;
