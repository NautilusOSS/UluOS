# UluOS Service Registry

## Goal

Allow MCP services to register themselves with UluGateway so capabilities can be discovered dynamically.

## Registration Payload

```json
{
  "service": "dorkfi",
  "version": "0.1.0",
  "baseUrl": "http://dorkfi-mcp:3015",
  "healthPath": "/health",
  "capabilitiesPath": "/capabilities",
  "chains": ["voi", "algorand"],
  "tags": ["protocol", "defi"]
}
```

## Registry Rules

- Gateway owns the final public capability map.
- Registered services must expose a health endpoint.
- Registered services should expose a machine-readable capability description.
- Gateway may reject services that violate policy, schema, or version requirements.
