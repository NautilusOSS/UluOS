# UluOS

A local-first integration environment for the Ulu MCP ecosystem. UluOS composes multiple MCP services behind a single gateway to provide unified blockchain access, signing, broadcasting, and DeFi protocol interaction for AI agents and developers.

## Architecture

```
                  ┌─────────────────┐
                  │   UluGateway    │  ← only public surface
                  │  (Control Plane)│
                  └────────┬────────┘
                           │
  ┌────────────────────────┼────────────────────────┐
  │              Protocol Layer                      │
  │                                                  │
  │  Voi                        Algorand             │
  │  ├─ HumbleSwapMCP           └─ PactFiMCP         │
  │  ├─ NomadexMCP                                   │
  │  ├─ EnvoiMCP                                     │
  │  └─ MimirMCP                                     │
  │                                                  │
  │  Cross-chain (Voi ↔ Algorand)                    │
  │  ├─ AramidBridgeMCP                              │
  │  └─ DorkFiMCP                                    │
  └────────────────────────┼────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │   Ecosystem Meaning Layer   │
            │  UluVoiMCP │ UluAlgorandMCP │
            └──────────────┼──────────────┘
                           │
            ┌──────────────┼──────────────┐
            │    Infrastructure Layer     │
            │ CoreMCP │ WalletMCP │ BcastMCP│
            └─────────────────────────────┘
```

## Services

### Control Plane

| Service | Purpose |
|---------|---------|
| **UluGateway** | Routing, capability discovery, workflow orchestration |

### Infrastructure (all chains)

| Service | Purpose |
|---------|---------|
| **UluCoreMCP** | Raw blockchain data (accounts, assets, transactions, TEAL) |
| **UluWalletMCP** | Key management and transaction signing (never public) |
| **UluBroadcastMCP** | Transaction submission and confirmation |

### Ecosystem Meaning

| Service | Chain | Purpose |
|---------|-------|---------|
| **UluVoiMCP** | Voi | Protocol discovery, enVoi naming, contract identification |
| **UluAlgorandMCP** | Algorand | Protocol discovery, NFDomains, contract identification |

### Protocol — Voi

| Service | Purpose |
|---------|---------|
| **HumbleSwapMCP** | Humble Swap DEX: pools, swaps, liquidity, price analytics, arbitrage |
| **NomadexMCP** | Nomadex DEX: pool discovery, swap quotes and transactions, add/remove liquidity |
| **EnvoiMCP** | enVoi name service: resolution, profiles, registration |
| **MimirMCP** | Mimir indexer: ARC200 tokens, ARC72 NFTs, marketplace data |

### Protocol — Algorand

| Service | Purpose |
|---------|---------|
| **PactFiMCP** | PactFi AMM DEX: pool discovery, swap quotes and transactions, add/remove liquidity |

### Protocol — Cross-chain

| Service | Chain | Purpose |
|---------|-------|---------|
| **AramidBridgeMCP** | Voi ↔ Algorand | Cross-chain token bridging |
| **DorkFiMCP** | Voi ↔ Algorand | DorkFi lending: markets, positions, deposits, liquidations |

## Quick Start

**Prerequisites:** Node.js >= 20 ([nvm](https://github.com/nvm-sh/nvm) recommended), Git with SSH access to the NautilusOSS org.

### One-liner

```bash
curl -fsSL https://raw.githubusercontent.com/NautilusOSS/UluOS/main/scripts/bootstrap.sh | bash
```

This clones UluOS and all service repos, installs dependencies, builds, and registers MCP servers in `~/.cursor/mcp.json`.

### Step by step

```bash
git clone git@github.com:NautilusOSS/UluOS.git && cd UluOS
./scripts/install-services.sh
```

`install-services.sh` clones sibling service repos, runs `npm install` + `npm run build` for each, and registers all stdio MCP servers in `~/.cursor/mcp.json`.

### Start using

Open the `UluOS` folder in Cursor — all 128 tools across 12 services are available immediately.

### HTTP gateway (Docker)

To run the gateway as an HTTP service (requires Docker):

```bash
./scripts/dev-up.sh
curl http://localhost:3000/health
curl http://localhost:3000/capabilities
```

## MCP Integration

The gateway is also an MCP server. Agents connect once and get access to all 128 tools across 12 services — no need to configure individual MCP connections.

**Cursor / local agents (stdio):**

```json
{
  "mcpServers": {
    "uluos": {
      "command": "node",
      "args": ["gateway/src/mcp-stdio.js"],
      "cwd": "/path/to/UluOS"
    }
  }
}
```

**Remote agents (SSE):**

Connect to `http://localhost:3000/mcp/sse` to establish an MCP session.

## Repository Structure

```
UluOS/
├── gateway/              # UluGateway source code and config
│   ├── src/              # Node.js application
│   ├── services.json     # Service registry
│   ├── config.example.json
│   └── *.schema.json     # JSON Schemas
├── examples/
│   └── capabilities/     # Per-service capability definitions
├── infra/
│   ├── docker-compose.yml
│   └── .env.example
├── scripts/              # Dev helper scripts
│   ├── dev-up.sh
│   ├── dev-down.sh
│   ├── dev-logs.sh
│   └── dev-ps.sh
└── docs/                 # Architecture and operating docs
```

## Documentation

| Document | Description |
|----------|-------------|
| [Local Development](docs/LOCAL_DEVELOPMENT.md) | Setup and day-to-day development |
| [Service Onboarding](docs/SERVICE_ONBOARDING.md) | Adding a new MCP service |
| [Architecture](docs/ULUOS_ARCHITECTURE.md) | Layer model and principles |
| [Service Contract](docs/ULUOS_SERVICE_CONTRACT.md) | Response envelope format |
| [Capability Schema](docs/ULUOS_CAPABILITY_SCHEMA.md) | Capability definition format |
| [Security Model](docs/ULUOS_SECURITY_MODEL.md) | Boundary rules |
| [Pricing Model](docs/ULUOS_PRICING_MODEL.md) | Tier definitions |
| [Golden Path: DorkFi](docs/GOLDEN_PATH_DORKFI.md) | End-to-end DorkFi workflow |
| [Gateway README](gateway/README.md) | Gateway internals |
| [Gateway Plan](gateway/IMPLEMENTATION_PLAN.md) | Gateway implementation roadmap |
| [Integration Roadmap](docs/ULUOS_INTEGRATION_ROADMAP.md) | Project phases |
| [Implementation Status](docs/IMPLEMENTATION_STATUS.md) | Current state |

## Dev Scripts

```bash
./scripts/install-services.sh # Clone missing MCP services + npm install
./scripts/setup-mcp.sh        # Register MCP servers in ~/.cursor/mcp.json
./scripts/dev-up.sh           # Start stack
./scripts/dev-down.sh         # Stop stack (-v to remove volumes)
./scripts/dev-logs.sh [svc]   # Tail logs
./scripts/dev-ps.sh           # Service status
```

## License

Proprietary. See individual service repositories for their respective licenses.
