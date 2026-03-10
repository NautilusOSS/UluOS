#!/usr/bin/env bash
set -euo pipefail

REQUIRED_NODE_MAJOR=20

# ── Ensure nvm is available ──────────────────────────────────────────
if ! command -v nvm &>/dev/null; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi

if ! command -v nvm &>/dev/null; then
  echo "ERROR: nvm is not installed."
  echo ""
  echo "  Install it first:"
  echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo ""
  exit 1
fi

# ── Ensure Node >= $REQUIRED_NODE_MAJOR ──────────────────────────────
if ! command -v node &>/dev/null; then
  echo "Node.js not found — installing via nvm..."
  nvm install "$REQUIRED_NODE_MAJOR"
  nvm use "$REQUIRED_NODE_MAJOR"
fi

NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Node.js v${NODE_MAJOR}.x detected but >= ${REQUIRED_NODE_MAJOR} required."
  echo "Switching via nvm..."
  nvm install "$REQUIRED_NODE_MAJOR"
  nvm use "$REQUIRED_NODE_MAJOR"
  NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
fi

echo "Using Node.js $(node --version) (nvm)"

# ── Clone / update UluOS ─────────────────────────────────────────────
REPO_URL="${ULUOS_REPO:-git@github.com:NautilusOSS/UluOS.git}"
INSTALL_DIR="${ULUOS_DIR:-$(pwd)/UluOS}"

if [ -d "$INSTALL_DIR" ]; then
  echo "UluOS already exists at $INSTALL_DIR — pulling latest"
  git -C "$INSTALL_DIR" pull --ff-only 2>/dev/null || true
else
  echo "Cloning UluOS..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

echo "Installing gateway dependencies..."
(cd "$INSTALL_DIR/gateway" && npm install --silent 2>/dev/null)

echo "Installing MCP services..."
"$INSTALL_DIR/scripts/install-services.sh"

echo ""
echo "Starting the dev stack..."
"$INSTALL_DIR/scripts/dev-up.sh"

echo ""
echo "UluOS is ready."
echo ""
echo "  cd $INSTALL_DIR"
echo ""
echo "  # Cursor (MCP stdio):"
echo "  #   .cursor/mcp.json is pre-configured"
echo ""
echo "  # HTTP gateway is running at:"
echo "  #   http://localhost:${GATEWAY_PORT:-3000}"
echo ""
