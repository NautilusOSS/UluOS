# UluOS Service Contract

## Success
```json
{
  "ok": true,
  "service": "core",
  "operation": "getAccount",
  "data": {},
  "meta": {
    "requestId": "req_123",
    "durationMs": 12
  }
}
```

## Error
```json
{
  "ok": false,
  "service": "wallet",
  "operation": "sign",
  "error": {
    "code": "SIGNER_NOT_FOUND",
    "message": "Signer does not exist"
  }
}
```
