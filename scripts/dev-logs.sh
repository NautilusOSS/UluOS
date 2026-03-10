#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../infra"

SERVICE="${1:-}"
if [ -n "$SERVICE" ]; then
  docker compose logs -f "$SERVICE"
else
  docker compose logs -f
fi
