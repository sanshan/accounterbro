# Documents load-test environment

This project owns the isolated Docker Compose environment used by Documents load tests. It does not use or modify the root development `docker-compose.yaml`.

Run the deterministic smoke profile from the repository root:

```bash
pnpm nx run @accounterbro/documents-service-load:smoke
```

Run the initial reference baseline:

```bash
pnpm nx run @accounterbro/documents-service-load:baseline
```

Both commands create a fresh isolated stack, execute the same public HTTP business scenario (`POST /documents`, then `GET /documents/:id`), gracefully stop Documents to flush its OpenTelemetry metrics, and write text, Markdown, and JSON reports under `reports/<run-id>`. Set `DOCUMENTS_LOAD_RUN_ID` to provide a stable run identifier; otherwise the command generates one.

The report keeps the overall k6 result and breaks client latency down into `register` and `get`. Server-side EDP latency is based on top-level lifecycle completion events (`execution.completed` for UseCaseExecutor/Runner and `read.completed` for Reader), so internal claim/attempt/source phases are not mixed into the displayed p95. UseCaseExecutor, Runner, and Reader retain their EDP UseCase/operation/read names.

Smoke uses one iteration and fails when any check or HTTP request fails. Baseline uses explicit 15-second warm-up, 30-second steady, and 15-second cool-down stages. Its latency results are an initial reference measurement, not an SLO or a required CI gate.

Local endpoints:

- Documents: http://localhost:3101
- Grafana: http://localhost:3300 (`admin` / `admin`)
- Prometheus: http://localhost:9091
- Tempo API: http://localhost:3201

Override the published ports with `DOCUMENTS_LOAD_HTTP_PORT`, `DOCUMENTS_LOAD_GRAFANA_PORT`, `DOCUMENTS_LOAD_PROMETHEUS_PORT`, and `DOCUMENTS_LOAD_TEMPO_PORT` when needed.

Grafana provisions both the official k6 Prometheus dashboard and the smaller AccounterBro Documents performance dashboard from version-controlled files under `grafana/dashboards`; no manual import is required. The latter keeps client request rate, latency, and failures beside the existing Documents EDP top-level lifecycle-duration and retry telemetry. The bundled Prometheus accepts k6 Remote Write metrics at the endpoint already configured on the Compose `k6` service. Documents sends its existing OpenTelemetry metrics and traces to the same LGTM container.

To start only the environment for inspection or troubleshooting:

```bash
pnpm nx run @accounterbro/documents-service-load:environment:up
```

Print the current isolated environment logs through the same Nx interface:

```bash
pnpm nx run @accounterbro/documents-service-load:environment:logs
```

Stop the environment and remove its disposable database, storage, and telemetry state with:

```bash
pnpm nx run @accounterbro/documents-service-load:environment:down
```

## GitHub Actions

The `Documents performance` workflow is intentionally separate from normal CI and runs only on demand after the workflow exists on the repository default branch.

From the Actions UI, select `Documents performance`, choose `smoke` or `baseline`, and run it for the required ref. On a pull request, a trusted repository member/collaborator can instead add exactly one of these comments:

```text
/performance smoke
/performance baseline
```

A comment-triggered run checks out the current PR head. A newer request does not cancel a performance run that has already started. The workflow uses the same Nx profile targets as local execution, renders the Markdown report directly in the job summary, uploads the complete report directory as an artifact, prints isolated-environment logs when the load step fails, and always calls the Nx cleanup target.

GitHub only delivers `workflow_dispatch` and `issue_comment` events for a workflow file that is present on the default branch. Therefore these triggers become testable after the Epic containing this workflow is merged to `main`; task/Epic branch CI can validate the code and workflow file but cannot produce a genuine on-demand event for it.
