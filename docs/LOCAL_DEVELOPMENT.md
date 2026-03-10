# Local Development Guide

## Prerequisites

- Docker Engine 24+ with Compose V2
- Node.js 20+ (for gateway development outside Docker)
- Git

## Quick Start

```bash
# Clone the repo
git clone <repo-url> UluOS && cd UluOS

# Start the stack
./scripts/dev-up.sh

# Verify
curl http://localhost:3000/health
```

## Dev Scripts

| Script | Purpose |
|--------|---------|
| `scripts/dev-up.sh` | Start the full stack (copies `.env.example` on first run) |
| `scripts/dev-down.sh` | Stop the stack (`-v` flag removes volumes) |
| `scripts/dev-logs.sh` | Tail logs for all services or a specific one |
| `scripts/dev-ps.sh` | Show running service status |

### Examples

```bash
# Tail only gateway logs
./scripts/dev-logs.sh gateway

# Check service health
./scripts/dev-ps.sh

# Stop and remove volumes
./scripts/dev-down.sh -v
```

## Environment Configuration

Copy and edit the environment file:

```bash
cp infra/.env.example infra/.env
```

Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `GATEWAY_PORT` | 3000 | Host port for the gateway |
| `ULUOS_API_KEY` | change-me-in-production | API key for authenticated endpoints |
| `CORE_MCP_IMAGE` | node:20-alpine | Docker image for UluCoreMCP |
| `VOI_ALGOD_TOKEN` | aaa...aaa | Algod API token for Voi node |

When using real MCP service images, uncomment and set the `*_IMAGE` variables in `.env`.

## Architecture

```
Host :3000 ──▶ UluGateway ──▶ private Docker network
                                ├── core-mcp    :3001
                                ├── wallet-mcp  :3002
                                ├── broadcast-mcp :3003
                                ├── voi-mcp     :3004
                                ├── algorand-mcp :3005
                                ├── envoi-mcp   :3007
                                ├── dorkfi-mcp  :3006
                                ├── voi-algod
                                ├── algorand-algod
                                └── algorand-indexer
```

Only the gateway is exposed to the host. All MCP services communicate over the `uluos-private` Docker network.

## Gateway Development

For iterating on the gateway without rebuilding Docker:

```bash
cd gateway
npm install
cp config.example.json config.json
# Edit config.json to point services at localhost or Docker IPs
node src/index.js
```

## Testing Endpoints

```bash
# Health check
curl http://localhost:3000/health

# List registered services
curl http://localhost:3000/services

# List all capabilities
curl http://localhost:3000/capabilities

# Execute a tool
curl -X POST http://localhost:3000/execute/core/get_network_status \
  -H "Content-Type: application/json" \
  -d '{"network": "voi-mainnet"}'

# DorkFi action (orchestrated)
curl -X POST http://localhost:3000/actions/dorkfi/deposit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: change-me-in-production" \
  -d '{"chain": "voi", "symbol": "VOI", "amount": "100", "sender": "ADDR...", "signerId": "my-signer"}'
```

## Troubleshooting

**Services show as unhealthy**: MCP service images default to `node:20-alpine` with a sleep command. Set real images in `.env` to get working health checks.

**Port conflicts**: Change `GATEWAY_PORT` in `.env` if port 3000 is in use.

**Node sync slow**: Voi and Algorand algod containers need time to sync. Check progress with `./scripts/dev-logs.sh voi-algod`.
