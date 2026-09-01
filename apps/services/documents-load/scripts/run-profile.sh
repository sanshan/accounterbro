#!/usr/bin/env bash

set -euo pipefail

profile="${1:-}"
if [[ "$profile" != "smoke" && "$profile" != "baseline" ]]; then
    echo "Usage: run-profile.sh <smoke|baseline>" >&2
    exit 2
fi

script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
project_directory=$(cd -- "$script_directory/.." && pwd)
workspace_directory=$(cd -- "$project_directory/../../../.." && pwd)
compose_file="$project_directory/docker-compose.yaml"
compose_project="accounterbro-documents-load"
run_id="${DOCUMENTS_LOAD_RUN_ID:-documents-${profile}-$(date -u +%Y%m%dT%H%M%SZ)}"

if [[ ! "$run_id" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "DOCUMENTS_LOAD_RUN_ID may contain only letters, digits, dots, underscores, and hyphens." >&2
    exit 2
fi

report_directory="$project_directory/reports/$run_id"
mkdir -p "$report_directory"

compose=(
    docker compose
    --project-name "$compose_project"
    --file "$compose_file"
)

cd "$workspace_directory"

# Every measurement owns a fresh database, storage directory, process, and telemetry store.
"${compose[@]}" down --volumes --remove-orphans
"${compose[@]}" up --detach --build --wait documents

started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
set +e
"${compose[@]}" run --rm --user "$(id -u):$(id -g)" \
    --environment "DOCUMENTS_LOAD_RUN_ID=$run_id" \
    --environment "DOCUMENTS_LOAD_PROFILE=$profile" \
    --environment "DOCUMENTS_LOAD_REPORT_DIRECTORY=/reports/$run_id" \
    k6 run \
    --out experimental-prometheus-rw \
    --tag "testid=$run_id" \
    --tag "profile=$profile" \
    "/load/k6/profiles/$profile.js"
k6_exit_code=$?
set -e
completed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Graceful shutdown flushes the Documents OpenTelemetry metric reader before reporting.
"${compose[@]}" stop --timeout 30 documents

prometheus_port="${DOCUMENTS_LOAD_PROMETHEUS_PORT:-9091}"
DOCUMENTS_LOAD_PROMETHEUS_URL="http://127.0.0.1:$prometheus_port" node \
    "$project_directory/scripts/create-report.mjs" \
    "$profile" \
    "$run_id" \
    "$started_at" \
    "$completed_at" \
    "$report_directory/k6-summary.json" \
    "$report_directory"

echo "Reports: $report_directory"

if [[ "$k6_exit_code" -ne 0 ]]; then
    exit "$k6_exit_code"
fi
