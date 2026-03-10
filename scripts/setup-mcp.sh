#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
SERVICES_JSON="$REPO_ROOT/gateway/services.json"
CURSOR_MCP="$HOME/.cursor/mcp.json"

mkdir -p "$(dirname "$CURSOR_MCP")"

node -e "
const fs = require('fs');
const path = require('path');

const cursorMcpPath = '$CURSOR_MCP';
const servicesPath = '$SERVICES_JSON';
const repoRoot = path.resolve('$REPO_ROOT');

const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));

let config = { mcpServers: {} };
if (fs.existsSync(cursorMcpPath)) {
  try { config = JSON.parse(fs.readFileSync(cursorMcpPath, 'utf8')); } catch {}
  if (!config.mcpServers) config.mcpServers = {};
}

let registered = 0;
for (const svc of services.services) {
  if (svc.transport !== 'stdio') continue;

  const entryPoint = (svc.args || [])[0];
  if (!entryPoint) continue;

  // Resolve the entry point relative to the repo root
  const absEntry = path.resolve(repoRoot, entryPoint);
  if (!fs.existsSync(absEntry)) {
    console.error('  SKIP  ' + svc.name + '  (' + absEntry + ' not found)');
    continue;
  }

  config.mcpServers[svc.name] = {
    command: svc.command,
    args: [absEntry],
    cwd: path.dirname(absEntry)
  };
  registered++;
  console.log('  OK    ' + svc.name + '  → ' + absEntry);
}

fs.writeFileSync(cursorMcpPath, JSON.stringify(config, null, 2) + '\n');
console.log('');
console.log('Registered ' + registered + ' MCP servers (stdio) in ' + cursorMcpPath);
"
