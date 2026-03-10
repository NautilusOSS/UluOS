#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MCP_STDIO="$REPO_ROOT/gateway/src/mcp-stdio.js"
SERVICES_JSON="$REPO_ROOT/gateway/services.json"
CAPABILITIES_DIR="$REPO_ROOT/examples/capabilities"
CURSOR_MCP="$HOME/.cursor/mcp.json"

if [ ! -f "$MCP_STDIO" ]; then
  echo "ERROR: $MCP_STDIO not found. Run this from the UluOS repo root."
  exit 1
fi

mkdir -p "$(dirname "$CURSOR_MCP")"

node -e "
const fs = require('fs');
const path = '$CURSOR_MCP';
const stdio = '$MCP_STDIO';
const svcJson = '$SERVICES_JSON';
const capDir = '$CAPABILITIES_DIR';

let config = { mcpServers: {} };
if (fs.existsSync(path)) {
  try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  if (!config.mcpServers) config.mcpServers = {};
}

config.mcpServers.uluos = {
  command: 'node',
  args: [stdio],
  env: {
    SERVICES_CONFIG: svcJson,
    CAPABILITIES_DIR: capDir
  }
};

fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
"

echo "Registered UluOS MCP server in $CURSOR_MCP"
