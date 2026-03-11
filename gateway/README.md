# UluGateway

The control plane for UluOS. Routes requests to MCP services, normalizes responses, exposes capability discovery, and orchestrates multi-service workflows.

## Endpoints

### Discovery & Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Gateway health check |
| GET | `/services` | No | List registered MCP services |
| GET | `/capabilities` | No | Aggregated capability registry |
| GET | `/pricing` | No | Pricing tier definitions |

### Tool Execution

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/execute/:service/:tool` | Varies | Route a tool call to an MCP service |

### Orchestrated Actions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/actions/dorkfi/deposit` | Yes | Build → Sign → Broadcast a deposit |
| POST | `/actions/dorkfi/borrow` | Yes | Build → Sign → Broadcast a borrow |
| POST | `/actions/dorkfi/repay` | Yes | Build → Sign → Broadcast a repay |
| POST | `/actions/dorkfi/withdraw` | Yes | Build → Sign → Broadcast a withdraw |

### MCP Protocol

| Transport | Endpoint | Description |
|-----------|----------|-------------|
| SSE | `GET /mcp/sse` | Establish SSE stream, receive session endpoint |
| SSE | `POST /mcp/messages?sessionId=...` | Send JSON-RPC messages to active session |
| stdio | `node src/mcp-stdio.js` | Local MCP server over stdin/stdout |

## MCP Server

The gateway is itself an MCP server. Instead of connecting to 7 individual MCP services, agents connect to the gateway once and get access to all 68 tools (64 direct + 4 orchestrated actions).

### SSE Transport (remote)

For remote agents or network-connected clients:

```
Agent connects → GET /mcp/sse
Server returns → event: endpoint, data: /mcp/messages?sessionId=xxx
Agent sends   → POST /mcp/messages?sessionId=xxx (JSON-RPC)
Server pushes → event: message, data: {JSON-RPC response}
```

### stdio Transport (local / Cursor)

For local development or Cursor MCP integration:

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

Or with Docker running:

```json
{
  "mcpServers": {
    "uluos": {
      "command": "docker",
      "args": ["exec", "-i", "infra-gateway-1", "node", "src/mcp-stdio.js"]
    }
  }
}
```

### Tools Exposed

| Category | Count | Examples |
|----------|-------|---------|
| Core | 15 | `core.get_account`, `core.search_transactions`, `core.compile_teal` |
| Broadcast | 6 | `broadcast.broadcast_transactions`, `broadcast.wait_for_confirmation` |
| Voi | 18 | `voi.resolve_name`, `voi.identify_application`, `voi.get_pools`, `voi.swap_txn` |
| Algorand | 10 | `algorand.resolve_name`, `algorand.get_protocol_summary` |
| Envoi | 6 | `envoi.resolve_name`, `envoi.get_profile`, `envoi.search_names` |
| DorkFi | 10 | `dorkfi.get_markets`, `dorkfi.deposit_txn` |
| Actions | 4 | `actions.dorkfi.deposit`, `actions.dorkfi.borrow` |

Wallet tools are excluded — the wallet is only reachable through orchestrated actions.

## Routing Model

```
Client Request
     │
     ▼
  Gateway
     │
     ├── Auth check (API key or x402)
     ├── Rate limit check
     ├── Resolve service + tool from URL
     ├── Validate visibility (reject internal services like wallet)
     ├── Forward request to MCP service
     ├── Wrap response in normalized envelope
     └── Return to client
```

For `/execute/:service/:tool`, the gateway acts as a transparent proxy with response normalization. The request body is forwarded as-is to the MCP service.

For `/actions/*` endpoints, the gateway orchestrates a multi-step pipeline (build → sign → broadcast → confirm).

## Capability Discovery

`GET /capabilities` returns the merged capability list from all registered services. The gateway loads capabilities from static JSON files in `examples/capabilities/` and can also fetch from each service's `capabilitiesPath` at startup.

Capabilities are filtered by visibility — `internal` service capabilities (wallet) are omitted from the public listing.

## Configuration

The gateway reads from two config sources:

1. `config.json` — server settings (port, auth, rate limits, telemetry)
2. `services.json` — service registry

Copy the examples to get started:

```bash
cp config.example.json config.json
cp services.json services.json  # already usable as-is
```

## Response Format

All responses use the normalized envelope from `docs/ULUOS_SERVICE_CONTRACT.md`:

```json
{
  "ok": true,
  "service": "core",
  "operation": "get_account",
  "data": {},
  "meta": {
    "requestId": "req_abc",
    "durationMs": 42
  }
}
```

## Auth Hooks

The gateway supports pluggable authentication:

- **api_key** — check `X-API-Key` header against configured keys
- **x402** — HTTP 402 payment-required flow (stub, not yet implemented)
- **none** — no authentication (development only)

Set via `config.json` → `auth.mode`.

## Logging

The gateway logs structured JSON to stdout:

```json
{
  "level": "info",
  "requestId": "req_abc",
  "service": "core",
  "tool": "get_account",
  "durationMs": 42,
  "status": 200
}
```

Log level is configured via `config.json` → `telemetry.logLevel`.

## Development

```bash
npm install
node src/index.js          # HTTP + SSE server
node src/mcp-stdio.js      # stdio MCP server (for Cursor / local agents)
```

The gateway is stateless. No database, no session store. All state lives in the MCP services.

## Future: Real MCP Backends (Option B)

The gateway currently proxies to MCP services via HTTP POST. The real Ulu MCP services speak MCP protocol (JSON-RPC over stdio/SSE), not plain REST. A future step is to add an MCP client adapter inside the gateway so it connects to real MCP service processes over their native transport instead of HTTP.

This is a transport-layer change and does not affect the gateway's public API, MCP tool definitions, or orchestration logic. The current HTTP proxy works with any service that accepts POST requests with JSON bodies, which is sufficient for development with stubs and for services that expose an HTTP interface.
