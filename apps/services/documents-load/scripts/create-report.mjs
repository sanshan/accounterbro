import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [profile, runId, startedAt, completedAt, k6SummaryPath, reportDirectory] = process.argv.slice(2);

if (!profile || !runId || !startedAt || !completedAt || !k6SummaryPath || !reportDirectory) {
    throw new Error(
        'Usage: create-report.mjs <profile> <run-id> <started-at> <completed-at> <k6-summary> <report-directory>',
    );
}

const prometheusUrl = process.env.DOCUMENTS_LOAD_PROMETHEUS_URL || 'http://127.0.0.1:9091';
const k6Summary = JSON.parse(await readFile(k6SummaryPath, 'utf8'));

function values(metricName) {
    return k6Summary.metrics[metricName]?.values ?? {};
}

function finite(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function lifecycleLabel(metric) {
    return {
        component: metric.edp_component ?? 'unknown',
        name: metric.edp_name ?? null,
        event: metric.edp_event ?? 'unknown',
    };
}

function retryLabel(metric) {
    return {
        component: metric.edp_component ?? 'unknown',
        name: metric.edp_name ?? null,
    };
}

function seriesKey({ component, name, event }) {
    return `${component}\u0000${name ?? ''}\u0000${event}`;
}

async function prometheusQuery(query) {
    const url = new URL('/api/v1/query', prometheusUrl);
    url.searchParams.set('query', query);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Prometheus query failed with HTTP ${response.status}: ${query}`);
    }

    const payload = await response.json();
    if (payload.status !== 'success' || payload.data?.resultType !== 'vector') {
        throw new Error(`Prometheus returned an unexpected response for query: ${query}`);
    }

    return payload.data.result;
}

async function waitForLifecycleSeries(query) {
    let lastError;

    for (let attempt = 1; attempt <= 20; attempt += 1) {
        try {
            const result = await prometheusQuery(query);
            if (result.length > 0) {
                return result;
            }
        } catch (error) {
            lastError = error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('Documents EDP lifecycle metrics did not reach Prometheus within 20 seconds.');
}

const topLevelEventMatcher = 'edp_event=~"execution.completed|read.completed"';
const lifecycleCountQuery = `sum by (edp_component, edp_name, edp_event) ({__name__=~"edp_lifecycle_duration.*_count", ${topLevelEventMatcher}})`;
const lifecycleP95Query = `histogram_quantile(0.95, sum by (le, edp_component, edp_name, edp_event) ({__name__=~"edp_lifecycle_duration.*_bucket", ${topLevelEventMatcher}}))`;
const retriesQuery = 'sum by (edp_component, edp_name) ({__name__=~"edp_retry_scheduled.*_total"})';

const lifecycleCounts = await waitForLifecycleSeries(lifecycleCountQuery);
const [lifecycleP95, retries] = await Promise.all([prometheusQuery(lifecycleP95Query), prometheusQuery(retriesQuery)]);

const p95BySeries = new Map(
    lifecycleP95.map(({ metric, value }) => {
        const label = lifecycleLabel(metric);
        return [seriesKey(label), finite(value[1])];
    }),
);

const lifecycleOrder = new Map([
    ['use-case-executor', 0],
    ['runner', 1],
    ['reader', 2],
]);

const lifecycle = lifecycleCounts
    .map(({ metric, value }) => {
        const label = lifecycleLabel(metric);
        return {
            ...label,
            observations: finite(value[1]),
            p95Milliseconds: p95BySeries.get(seriesKey(label)) ?? null,
        };
    })
    .sort((left, right) => {
        const componentOrder =
            (lifecycleOrder.get(left.component) ?? Number.MAX_SAFE_INTEGER) -
            (lifecycleOrder.get(right.component) ?? Number.MAX_SAFE_INTEGER);
        if (componentOrder !== 0) {
            return componentOrder;
        }

        return (left.name ?? '').localeCompare(right.name ?? '');
    });

const retrySeries = retries.map(({ metric, value }) => ({
    ...retryLabel(metric),
    scheduled: finite(value[1]),
}));

function operationSummary(operation) {
    const requests = values(`documents_http_${operation}_requests`);
    const failures = values(`documents_http_${operation}_failed`);
    const latency = values(`documents_http_${operation}_duration`);

    return {
        operation,
        requests: {
            count: finite(requests.count),
            perSecond: finite(requests.rate),
        },
        failureRate: finite(failures.rate),
        latencyMilliseconds: {
            average: finite(latency.avg),
            minimum: finite(latency.min),
            median: finite(latency.med),
            maximum: finite(latency.max),
            p90: finite(latency['p(90)']),
            p95: finite(latency['p(95)']),
            p99: finite(latency['p(99)']),
        },
    };
}

const requests = values('http_reqs');
const iterations = values('iterations');
const failedRequests = values('http_req_failed');
const checks = values('checks');
const latency = values('http_req_duration');
const operations = ['register', 'get'].map(operationSummary);

const report = {
    run: {
        id: runId,
        profile,
        startedAt,
        completedAt,
        durationSeconds: (Date.parse(completedAt) - Date.parse(startedAt)) / 1_000,
        environment: 'fresh isolated Docker Compose stack',
        interpretation:
            profile === 'baseline'
                ? 'Initial reference measurement; this profile defines no latency SLO.'
                : 'Functional smoke gate: every check and HTTP request must succeed.',
    },
    client: {
        requests: {
            count: finite(requests.count),
            perSecond: finite(requests.rate),
        },
        iterations: {
            count: finite(iterations.count),
            perSecond: finite(iterations.rate),
        },
        checks: {
            passed: finite(checks.passes),
            failed: finite(checks.fails),
            successRate: finite(checks.rate),
        },
        httpFailureRate: finite(failedRequests.rate),
        latencyMilliseconds: {
            average: finite(latency.avg),
            minimum: finite(latency.min),
            median: finite(latency.med),
            maximum: finite(latency.max),
            p90: finite(latency['p(90)']),
            p95: finite(latency['p(95)']),
            p99: finite(latency['p(99)']),
        },
        operations,
    },
    documentsEdp: {
        lifecycle: {
            semantics: {
                'use-case-executor': 'execution.completed',
                runner: 'execution.completed',
                reader: 'read.completed',
            },
            series: lifecycle,
            useCaseNameAvailable: true,
        },
        retries: {
            totalScheduled: retrySeries.reduce((total, series) => total + (series.scheduled ?? 0), 0),
            series: retrySeries,
        },
    },
};

function decimal(value, digits = 2) {
    return typeof value === 'number' ? value.toFixed(digits) : 'n/a';
}

function percentage(value) {
    return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : 'n/a';
}

function lifecycleName(series) {
    return series.name ?? 'n/a';
}

function componentName(component) {
    switch (component) {
        case 'use-case-executor':
            return 'UseCaseExecutor';
        case 'runner':
            return 'Runner';
        case 'reader':
            return 'Reader';
        default:
            return component;
    }
}

function markdownCell(value) {
    return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

const operationLines = operations.map(
    (operation) =>
        `- ${operation.operation}: requests=${decimal(operation.requests.count, 0)}, failures=${percentage(
            operation.failureRate,
        )}, avg=${decimal(operation.latencyMilliseconds.average)} ms, p95=${decimal(
            operation.latencyMilliseconds.p95,
        )} ms, p99=${decimal(operation.latencyMilliseconds.p99)} ms`,
);
const lifecycleLines = lifecycle.map(
    (series) =>
        `- ${componentName(series.component)}/${lifecycleName(series)} (${series.event}): count=${decimal(
            series.observations,
            0,
        )}, p95=${decimal(series.p95Milliseconds)} ms`,
);
const retryLines =
    retrySeries.length === 0
        ? ['- No EDP retries were scheduled.']
        : retrySeries.map(
              (series) =>
                  `- ${componentName(series.component)}/${series.name ?? 'n/a'}: ${decimal(
                      series.scheduled,
                      0,
                  )} scheduled`,
          );

const textReport = [
    `Documents ${profile} load report`,
    `Run ID: ${runId}`,
    `Window: ${startedAt} to ${completedAt}`,
    report.run.interpretation,
    '',
    'Client (k6)',
    `- Requests: ${decimal(report.client.requests.count, 0)} (${decimal(report.client.requests.perSecond)}/s)`,
    `- Iterations: ${decimal(report.client.iterations.count, 0)} (${decimal(report.client.iterations.perSecond)}/s)`,
    `- Check success: ${percentage(report.client.checks.successRate)} (${decimal(
        report.client.checks.failed,
        0,
    )} failed)`,
    `- HTTP failure rate: ${percentage(report.client.httpFailureRate)}`,
    `- Overall latency ms: avg=${decimal(report.client.latencyMilliseconds.average)} min=${decimal(
        report.client.latencyMilliseconds.minimum,
    )} median=${decimal(report.client.latencyMilliseconds.median)} max=${decimal(
        report.client.latencyMilliseconds.maximum,
    )} p90=${decimal(report.client.latencyMilliseconds.p90)} p95=${decimal(
        report.client.latencyMilliseconds.p95,
    )} p99=${decimal(report.client.latencyMilliseconds.p99)}`,
    '',
    'HTTP operations',
    ...operationLines,
    '',
    'Documents EDP top-level lifecycle',
    ...lifecycleLines,
    '',
    'Documents EDP retries',
    ...retryLines,
    '',
].join('\n');

const markdownOperations = operations
    .map(
        (operation) =>
            `| ${markdownCell(operation.operation)} | ${decimal(operation.requests.count, 0)} | ${percentage(
                operation.failureRate,
            )} | ${decimal(operation.latencyMilliseconds.average)} ms | ${decimal(
                operation.latencyMilliseconds.p95,
            )} ms | ${decimal(operation.latencyMilliseconds.p99)} ms |`,
    )
    .join('\n');

const markdownLifecycle = lifecycle
    .map(
        (series) =>
            `| ${markdownCell(componentName(series.component))} | ${markdownCell(
                lifecycleName(series),
            )} | ${markdownCell(series.event)} | ${decimal(series.observations, 0)} | ${decimal(
                series.p95Milliseconds,
            )} ms |`,
    )
    .join('\n');

const markdownRetries =
    retrySeries.length === 0
        ? 'No EDP retries were scheduled.'
        : [
              '| Layer | Operation/read | Scheduled |',
              '| --- | --- | ---: |',
              ...retrySeries.map(
                  (series) =>
                      `| ${markdownCell(componentName(series.component))} | ${markdownCell(
                          series.name ?? 'n/a',
                      )} | ${decimal(series.scheduled, 0)} |`,
              ),
          ].join('\n');

const markdownReport = [
    '### Client summary',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Requests | ${decimal(report.client.requests.count, 0)} (${decimal(report.client.requests.perSecond)}/s) |`,
    `| Iterations | ${decimal(report.client.iterations.count, 0)} (${decimal(report.client.iterations.perSecond)}/s) |`,
    `| Check success | ${percentage(report.client.checks.successRate)} |`,
    `| HTTP failure rate | ${percentage(report.client.httpFailureRate)} |`,
    `| Overall latency p95 | ${decimal(report.client.latencyMilliseconds.p95)} ms |`,
    `| Overall latency p99 | ${decimal(report.client.latencyMilliseconds.p99)} ms |`,
    '',
    '### HTTP operations',
    '',
    '| Operation | Requests | Failure rate | Avg | p95 | p99 |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    markdownOperations,
    '',
    '### EDP top-level lifecycle',
    '',
    '| Layer | UseCase/operation/read | Lifecycle event | Observations | p95 |',
    '| --- | --- | --- | ---: | ---: |',
    markdownLifecycle,
    '',
    '### EDP retries',
    '',
    markdownRetries,
    '',
].join('\n');

await Promise.all([
    writeFile(join(reportDirectory, 'documents-load-report.json'), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(join(reportDirectory, 'documents-load-report.txt'), textReport),
    writeFile(join(reportDirectory, 'documents-load-report.md'), markdownReport),
]);

process.stdout.write(textReport);
