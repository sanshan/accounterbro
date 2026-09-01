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

Both commands create a fresh isolated stack, execute the same public HTTP business scenario (`POST /documents`, then `GET /documents/:id`), gracefully stop Documents to flush its OpenTelemetry metrics, and write text and JSON reports under `reports/<run-id>`. Set `DOCUMENTS_LOAD_RUN_ID` to provide a stable run identifier; otherwise the command generates one.

Smoke uses one iteration and fails when any check or HTTP request fails. Baseline uses explicit 15-second warm-up, 30-second steady, and 15-second cool-down stages. Its latency results are an initial reference measurement, not an SLO or a required CI gate.

Local endpoints:

- Documents: http://localhost:3101
- Grafana: http://localhost:3300 (`admin` / `admin`)
- Prometheus: http://localhost:9091
- Tempo API: http://localhost:3201

Override the published ports with `DOCUMENTS_LOAD_HTTP_PORT`, `DOCUMENTS_LOAD_GRAFANA_PORT`, `DOCUMENTS_LOAD_PROMETHEUS_PORT`, and `DOCUMENTS_LOAD_TEMPO_PORT` when needed.

Grafana provisions both the official k6 Prometheus dashboard and the smaller AccounterBro Documents performance dashboard from version-controlled files under `grafana/dashboards`; no manual import is required. The latter keeps client request rate, latency, and failures beside the existing Documents EDP lifecycle-duration and retry telemetry. The bundled Prometheus accepts k6 Remote Write metrics at the endpoint already configured on the Compose `k6` service. Documents sends its existing OpenTelemetry metrics and traces to the same LGTM container.

To start only the environment for inspection or troubleshooting:

```bash
pnpm nx run @accounterbro/documents-service-load:environment:up
```

Stop the environment and remove its disposable database, storage, and telemetry state with:

```bash
pnpm nx run @accounterbro/documents-service-load:environment:down
```
