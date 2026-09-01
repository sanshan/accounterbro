# Documents load-test environment

This project owns the isolated Docker Compose environment used by Documents load tests. It does not use or modify the root development `docker-compose.yaml`.

Start the environment from the repository root:

```bash
pnpm nx run @accounterbro/documents-service-load:environment:up
```

The command builds the load-test-only Documents image, starts PostgreSQL and `grafana/otel-lgtm`, applies all Documents migrations, then waits for Documents readiness.

Local endpoints:

- Documents: http://localhost:3101
- Grafana: http://localhost:3300 (`admin` / `admin`)
- Prometheus: http://localhost:9091
- Tempo API: http://localhost:3201

Override the published ports with `DOCUMENTS_LOAD_HTTP_PORT`, `DOCUMENTS_LOAD_GRAFANA_PORT`, `DOCUMENTS_LOAD_PROMETHEUS_PORT`, and `DOCUMENTS_LOAD_TEMPO_PORT` when needed.

Grafana provisions the official k6 Prometheus dashboard from the version-controlled file under `grafana/dashboards`; no manual import is required. The bundled Prometheus accepts k6 Remote Write metrics at the endpoint already configured on the Compose `k6` service. Documents sends its existing OpenTelemetry metrics and traces to the same LGTM container.

Stop the environment and remove its disposable database, storage, and telemetry state with:

```bash
pnpm nx run @accounterbro/documents-service-load:environment:down
```
