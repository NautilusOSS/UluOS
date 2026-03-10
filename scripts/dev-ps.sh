#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../infra"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
