#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra"
ENV_FILE="$INFRA_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env found — copying from .env.example"
  cp "$INFRA_DIR/.env.example" "$ENV_FILE"
fi

cd "$INFRA_DIR"
docker compose --env-file .env up -d --build
echo ""
echo "UluOS dev stack started."
echo "  Gateway:  http://localhost:${GATEWAY_PORT:-3000}"
echo "  Health:   http://localhost:${GATEWAY_PORT:-3000}/health"
echo ""
echo "Run 'scripts/dev-logs.sh' to tail logs."
echo "Run 'scripts/dev-ps.sh'   to check status."
