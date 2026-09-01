function metricValues(data, metricName) {
    return data.metrics[metricName]?.values ?? {};
}

function fixed(value, digits = 2) {
    return typeof value === 'number' ? value.toFixed(digits) : 'n/a';
}

function percent(value) {
    return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : 'n/a';
}

export const summaryTrendStats = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];

export function documentsSummary(data) {
    const reportDirectory = __ENV.DOCUMENTS_LOAD_REPORT_DIRECTORY || '/reports/local';
    const requests = metricValues(data, 'http_reqs');
    const failedRequests = metricValues(data, 'http_req_failed');
    const checks = metricValues(data, 'checks');
    const latency = metricValues(data, 'http_req_duration');
    const text = [
        `Documents load run: ${__ENV.DOCUMENTS_LOAD_RUN_ID || 'local'}`,
        `Profile: ${__ENV.DOCUMENTS_LOAD_PROFILE || 'unknown'}`,
        `HTTP requests: ${requests.count ?? 'n/a'} (${fixed(requests.rate)} requests/s)`,
        `HTTP failure rate: ${percent(failedRequests.rate)}`,
        `Check rate: ${percent(checks.rate)} (${checks.passes ?? 'n/a'} passed, ${checks.fails ?? 'n/a'} failed)`,
        `Latency (ms): avg=${fixed(latency.avg)} min=${fixed(latency.min)} med=${fixed(
            latency.med,
        )} max=${fixed(latency.max)} p90=${fixed(latency['p(90)'])} p95=${fixed(
            latency['p(95)'],
        )} p99=${fixed(latency['p(99)'])}`,
    ].join('\n');

    return {
        stdout: `${text}\n`,
        [`${reportDirectory}/k6-summary.json`]: JSON.stringify(data, null, 2),
        [`${reportDirectory}/k6-summary.txt`]: `${text}\n`,
    };
}
