# UluOS

A local-first integration environment for the Ulu MCP ecosystem. UluOS composes multiple MCP services behind a single gateway to provide unified blockchain access, signing, broadcasting, and DeFi protocol interaction for AI agents and developers.

## Architecture

```
            ┌─────────────────┐
            │   UluGateway    │  ← only public surface
            │  (Control Plane)│
            └────────┬────────┘
                     │
         ┌───────────┼───────────────┐
         │      Protocol Layer      │
         │   DorkFiMCP │ EnvoiMCP   │
         └───────────┬───────────────┘
                     │
    ┌────────────────┼────────────────┐
    │     Ecosystem Meaning Layer     │
    │   UluVoiMCP  │  UluAlgorandMCP  │
    └────────────────┼────────────────┘
                     │
  ┌──────────────────┼──────────────────┐
  │       Infrastructure Layer          │
  │ UluCoreMCP │ WalletMCP │ BroadcastMCP│
  └─────────────────────────────────────┘
```

## Services

| Service | Layer | Purpose |
|---------|-------|---------|
| **UluGateway** | Control Plane | Routing, capability discovery, workflow orchestration |
| **UluCoreMCP** | Infrastructure | Raw blockchain data (accounts, assets, transactions, TEAL) |
| **UluWalletMCP** | Infrastructure | Key management and transaction signing (never public) |
| **UluBroadcastMCP** | Infrastructure | Transaction submission and confirmation |
| **UluVoiMCP** | Ecosystem | Voi protocol discovery, enVoi naming, contract identification |
| **UluAlgorandMCP** | Ecosystem | Algorand protocol discovery, NFDomains, contract identification |
| **DorkFiMCP** | Protocol | DorkFi lending: markets, positions, deposits, liquidations |
| **EnvoiMCP** | Protocol | enVoi name service: resolution, profiles, registration lookup |

## Quick Start

One command to clone everything, install dependencies, and start the stack:

```bash
curl -fsSL https://raw.githubusercontent.com/NautilusOSS/UluOS/main/scripts/bootstrap.sh | bash
```

Or step by step:

```bash
git clone git@github.com:NautilusOSS/UluOS.git && cd UluOS
./scripts/install-services.sh
./scripts/dev-up.sh
```

Then open the folder in Cursor — `.cursor/mcp.json` is pre-configured and all 61 tools are available immediately. Missing service repos are automatically stubbed.

```bash
curl http://localhost:3000/health
curl http://localhost:3000/capabilities
```

## MCP Integration

The gateway is also an MCP server. Agents connect once and get access to all 61 tools across 7 services — no need to configure individual MCP connections.

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
./scripts/dev-up.sh           # Start stack
./scripts/dev-down.sh         # Stop stack (-v to remove volumes)
./scripts/dev-logs.sh [svc]   # Tail logs
./scripts/dev-ps.sh           # Service status
```

## License

Proprietary. See individual service repositories for their respective licenses.
