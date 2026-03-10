#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../infra"
docker compose down "$@"
echo "UluOS dev stack stopped."
