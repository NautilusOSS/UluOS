# Service Onboarding Guide

How to add a new MCP service to UluOS.

## Requirements

A service must:

1. Expose an HTTP health endpoint that returns `{"status": "ok"}`
2. Provide a machine-readable capability list at a known path
3. Conform to the UluOS response envelope (see `docs/ULUOS_SERVICE_CONTRACT.md`)
4. Run on the private Docker network (never exposed publicly)

## Step 1 — Define the Service

Add an entry to `gateway/services.json`:

```json
{
  "name": "my-service",
  "version": "0.1.0",
  "baseUrl": "http://my-service:3010",
  "layer": "protocol",
  "healthPath": "/health",
  "capabilitiesPath": "/capabilities",
  "chains": ["voi-mainnet"],
  "tags": ["defi"],
  "visibility": "private",
  "description": "What this service does"
}
```

Validate against `gateway/service-registry.schema.json`.

## Step 2 — Define Capabilities

Create `examples/capabilities/my-service.json` as an array of capability objects. Each capability must conform to `gateway/capability.schema.json`.

Key fields:

| Field | Purpose |
|-------|---------|
| `name` | Fully qualified: `my-service.tool_name` |
| `readOnly` | `true` for queries, `false` for state changes |
| `requiresSigning` | `true` if the gateway should route through WalletMCP |
| `requiresBroadcast` | `true` if the gateway should route through BroadcastMCP |
| `pricingTier` | `free`, `standard`, `premium`, or `enterprise` |

## Step 3 — Add to Docker Compose

Add the service to `infra/docker-compose.yml`:

```yaml
my-service:
  image: ${MY_SERVICE_IMAGE:-node:20-alpine}
  command: ["node", "server.js"]
  working_dir: /app
  environment:
    PORT: 3010
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:3010/health"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 15s
  networks:
    - uluos-private
```

Add the image variable to `infra/.env.example`:

```
# MY_SERVICE_IMAGE=ghcr.io/org/my-service:latest
```

If the gateway depends on this service at startup, add it to the gateway's `depends_on`.

## Step 4 — Add Environment Variables

Add the internal URL to `infra/.env.example`:

```
MY_SERVICE_URL=http://my-service:3010
```

## Step 5 — Test

```bash
# Start the stack
./scripts/dev-up.sh

# Verify the service appears
curl http://localhost:3000/services | jq '.[] | select(.name == "my-service")'

# Verify capabilities
curl http://localhost:3000/capabilities | jq '.[] | select(.service == "my-service")'

# Execute a tool
curl -X POST http://localhost:3000/execute/my-service/some_tool \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

## Visibility Rules

| Visibility | Meaning |
|------------|---------|
| `public` | Callable directly by external clients (only gateway) |
| `private` | Callable through gateway routing |
| `internal` | Only callable by gateway during orchestrated workflows (e.g. wallet) |

The wallet service must always be `internal`. It is never routed to directly by external requests.

## Response Envelope

All service responses passing through the gateway are wrapped:

```json
{
  "ok": true,
  "service": "my-service",
  "operation": "some_tool",
  "data": { ... },
  "meta": {
    "requestId": "req_abc",
    "durationMs": 15
  }
}
```

Services can return raw JSON — the gateway handles wrapping.
