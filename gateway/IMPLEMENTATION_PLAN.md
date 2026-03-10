# UluGateway Implementation Plan

## Overview

UluGateway is a stateless Node.js HTTP service that serves as the single public entry point for UluOS. It routes requests to backend MCP services, normalizes responses, and orchestrates multi-service workflows.

## Technology

- **Runtime**: Node.js 20+
- **Framework**: Express.js (minimal, well-understood, no magic)
- **No database**: Stateless by design
- **Config**: JSON files loaded at startup

## Module Structure

```
gateway/
├── src/
│   ├── index.js              # Entry point, server startup
│   ├── config.js             # Config loader (config.json + services.json)
│   ├── middleware/
│   │   ├── auth.js           # API key / x402 authentication
│   │   ├── rateLimit.js      # Per-key rate limiting
│   │   ├── requestId.js      # Generate and attach request IDs
│   │   └── errorHandler.js   # Catch-all error normalization
│   ├── routes/
│   │   ├── health.js         # GET /health
│   │   ├── services.js       # GET /services
│   │   ├── capabilities.js   # GET /capabilities
│   │   ├── pricing.js        # GET /pricing
│   │   ├── execute.js        # POST /execute/:service/:tool
│   │   └── actions.js        # POST /actions/dorkfi/*
│   ├── mcp/
│   │   ├── protocol.js       # MCP JSON-RPC handler (initialize, tools/list, tools/call)
│   │   ├── tools.js          # Tool registry (capabilities → MCP tools + orchestrated actions)
│   │   └── sse.js            # SSE transport (Express routes)
│   ├── mcp-stdio.js          # stdio transport entry point
│   ├── services/
│   │   ├── registry.js       # Service registry (load + lookup)
│   │   ├── proxy.js          # Forward requests to MCP services
│   │   └── orchestrator.js   # Multi-step workflow execution
│   └── utils/
│       ├── envelope.js       # Response envelope helpers
│       └── logger.js         # Structured JSON logger
├── Dockerfile
├── package.json
├── config.example.json
├── services.json
├── service-registry.schema.json
└── capability.schema.json
```

## Routing Model

### Direct Execution (`/execute/:service/:tool`)

1. Resolve service from registry by name
2. Check visibility — reject if `internal`
3. Authenticate if capability requires it
4. Forward request body to `service.baseUrl/tool`
5. Wrap response in normalized envelope
6. Return to client

### Orchestrated Actions (`/actions/dorkfi/*`)

1. Authenticate (always required for actions)
2. Call DorkFiMCP to build unsigned transactions
3. Call WalletMCP to sign transactions
4. Call BroadcastMCP to submit signed transactions
5. Call BroadcastMCP to wait for confirmation
6. Wrap final result in normalized envelope
7. Return to client

If any step fails, return immediately with an error envelope indicating which step failed.

## Capability Discovery

At startup, the gateway:

1. Loads `services.json` to build the service registry
2. Loads capability files from a configured directory
3. Filters out internal capabilities (wallet) for public listing
4. Serves the merged list at `GET /capabilities`

Future: fetch capabilities dynamically from each service's `/capabilities` endpoint.

## Auth Strategy

### Phase 1 (Current)

- API key via `X-API-Key` header
- Single key from environment variable
- Free-tier endpoints bypass auth

### Phase 2 (Future)

- Multiple API keys with per-key rate limits
- x402 payment protocol for premium operations
- JWT tokens for session-based access

## Rate Limiting

In-memory sliding window per API key. Configurable via `config.json`:

```json
{
  "rateLimit": {
    "enabled": true,
    "windowMs": 60000,
    "maxRequests": 120
  }
}
```

Future: Redis-backed rate limiting for multi-instance deployments.

## Payment Hooks (x402)

Stub implementation that returns HTTP 402 with payment instructions. Not yet functional. When enabled:

1. Gateway checks if capability requires payment
2. If x402 is enabled and no payment proof is present, return 402
3. If payment proof is present, validate and proceed

## Telemetry

- Structured JSON logs to stdout
- Request ID on every log line
- Duration tracking per request
- Service/tool/status on every execution

Future: OpenTelemetry traces, Prometheus metrics.

## Error Handling

All errors are caught and returned as normalized error envelopes:

```json
{
  "ok": false,
  "service": "gateway",
  "operation": "execute",
  "error": {
    "code": "SERVICE_NOT_FOUND",
    "message": "No service registered with name 'unknown'"
  }
}
```

Upstream MCP errors are wrapped with the originating service name.

## Implementation Phases

### Phase A — Core Server (current)

- Express server with health, services, capabilities, pricing
- Config loading
- Service registry
- Request ID middleware
- Structured logging
- Normalized response envelope

### Phase B — Routing

- `/execute/:service/:tool` proxy
- Visibility enforcement
- API key auth middleware

### Phase C — Orchestration

- `/actions/dorkfi/*` endpoints
- Build → sign → broadcast → confirm pipeline
- Step-level error reporting

### Phase D — MCP Server (current)

- Gateway exposed as an MCP server (JSON-RPC 2.0)
- SSE transport: `GET /mcp/sse` + `POST /mcp/messages`
- stdio transport: `node src/mcp-stdio.js`
- 55 tools: 51 direct capabilities + 4 orchestrated DorkFi actions
- Wallet tools excluded from public tool listing
- Tool calls routed through the same proxy/orchestrator as HTTP

### Phase E — Hardening

- Rate limiting
- Input validation
- Timeout handling for upstream services
- Graceful shutdown

### Phase F — Payment & Billing

- x402 stub
- Per-capability pricing enforcement
- Usage tracking

### Phase G — Native MCP Backends (Option B)

The gateway currently proxies to MCP services over HTTP POST. This works for development stubs and services with HTTP interfaces. A future phase replaces the HTTP proxy with an MCP client adapter that connects to real MCP service processes over their native transport (stdio or SSE).

Scope:
- Add MCP client transport layer in `src/services/mcp-client.js`
- Support stdio-based MCP connections (spawn child process per service)
- Support SSE-based MCP connections (connect to remote MCP endpoints)
- Fall back to HTTP proxy for services that don't speak MCP
- No changes to the gateway's public API, tool definitions, or orchestration logic

This is a transport concern — the gateway's public interface (HTTP REST + MCP server) remains identical regardless of how it connects to backend services.

## Constraints

- Gateway must remain stateless
- Wallet service must never be directly routable
- Broadcast service cannot sign
- All responses normalized through the envelope
- Service registry must be machine-readable
