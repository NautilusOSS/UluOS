# Golden Path: DorkFi Deposit

An end-to-end walkthrough of a DorkFi deposit through UluOS, from capability discovery to on-chain confirmation.

## Actors

- **Client** — an AI agent or developer application
- **Gateway** — UluGateway (the only public endpoint)
- **DorkFi** — DorkFiMCP (builds transactions)
- **Wallet** — UluWalletMCP (signs transactions)
- **Broadcast** — UluBroadcastMCP (submits and confirms)

## Sequence

```
Client                Gateway              DorkFi        Wallet       Broadcast
  │                      │                    │            │              │
  │  GET /capabilities   │                    │            │              │
  │─────────────────────▶│                    │            │              │
  │  capability list     │                    │            │              │
  │◀─────────────────────│                    │            │              │
  │                      │                    │            │              │
  │  POST /actions/      │                    │            │              │
  │    dorkfi/deposit    │                    │            │              │
  │─────────────────────▶│                    │            │              │
  │                      │  deposit_txn       │            │              │
  │                      │───────────────────▶│            │              │
  │                      │  unsigned txns     │            │              │
  │                      │◀───────────────────│            │              │
  │                      │                    │            │              │
  │                      │  sign_transactions │            │              │
  │                      │───────────────────────────────▶│              │
  │                      │  signed txns       │            │              │
  │                      │◀───────────────────────────────│              │
  │                      │                    │            │              │
  │                      │  broadcast_transactions         │              │
  │                      │────────────────────────────────────────────▶  │
  │                      │  txids             │            │              │
  │                      │◀────────────────────────────────────────────  │
  │                      │                    │            │              │
  │                      │  wait_for_confirmation          │              │
  │                      │────────────────────────────────────────────▶  │
  │                      │  confirmed         │            │              │
  │                      │◀────────────────────────────────────────────  │
  │                      │                    │            │              │
  │  normalized response │                    │            │              │
  │◀─────────────────────│                    │            │              │
```

## Step-by-Step

### 1. Discover Capabilities

The client queries the gateway for available capabilities.

```bash
curl http://localhost:3000/capabilities
```

Response includes `dorkfi.deposit_txn` with metadata indicating it requires auth, signing, and broadcast.

### 2. Check Market Data (Optional)

Before depositing, the client can query market conditions.

```bash
curl -X POST http://localhost:3000/execute/dorkfi/get_markets \
  -H "Content-Type: application/json" \
  -d '{"chain": "voi"}'
```

```json
{
  "ok": true,
  "service": "dorkfi",
  "operation": "get_markets",
  "data": {
    "markets": [
      {
        "symbol": "VOI",
        "depositRate": "3.2%",
        "borrowRate": "5.1%",
        "totalDeposits": "1000000",
        "totalBorrows": "450000"
      }
    ]
  },
  "meta": { "requestId": "req_001", "durationMs": 45 }
}
```

### 3. Execute the Deposit

The client calls the orchestrated deposit action. The gateway handles the full build → sign → broadcast → confirm pipeline internally.

```bash
curl -X POST http://localhost:3000/actions/dorkfi/deposit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-api-key" \
  -d '{
    "chain": "voi",
    "symbol": "VOI",
    "amount": "100",
    "sender": "ABCDEF...",
    "signerId": "my-hot-signer"
  }'
```

### 4. What Happens Inside the Gateway

The gateway performs these steps sequentially:

#### 4a. Build Unsigned Transactions

Gateway calls DorkFiMCP:

```
POST http://dorkfi-mcp:3006/deposit_txn
{
  "chain": "voi",
  "symbol": "VOI",
  "amount": "100",
  "sender": "ABCDEF..."
}
```

DorkFi returns an array of base64-encoded unsigned transactions.

#### 4b. Sign Transactions

Gateway calls WalletMCP:

```
POST http://wallet-mcp:3002/wallet_sign_transactions
{
  "signerId": "my-hot-signer",
  "transactions": ["base64-unsigned-txn-1", "base64-unsigned-txn-2"]
}
```

Wallet applies policy checks, signs with the specified signer, and returns base64-encoded signed transactions.

#### 4c. Broadcast Signed Transactions

Gateway calls BroadcastMCP:

```
POST http://broadcast-mcp:3003/broadcast_transactions
{
  "network": "voi-mainnet",
  "txns": ["base64-signed-txn-1", "base64-signed-txn-2"]
}
```

Broadcast submits to the network and returns transaction IDs.

#### 4d. Wait for Confirmation

Gateway calls BroadcastMCP:

```
POST http://broadcast-mcp:3003/wait_for_confirmation
{
  "network": "voi-mainnet",
  "txid": "TXID123...",
  "rounds": 5
}
```

### 5. Client Receives Normalized Response

```json
{
  "ok": true,
  "service": "dorkfi",
  "operation": "deposit",
  "data": {
    "txids": ["TXID123..."],
    "confirmed": true,
    "confirmedRound": 12345678
  },
  "meta": {
    "requestId": "req_002",
    "durationMs": 4200
  }
}
```

## Security Boundaries

| Step | Service | Network Access |
|------|---------|---------------|
| Build | DorkFiMCP | Private only |
| Sign | WalletMCP | Internal only (gateway-to-wallet) |
| Broadcast | BroadcastMCP | Private only |
| Confirm | BroadcastMCP | Private only |

The client never communicates with WalletMCP. The wallet boundary is enforced by Docker network isolation and gateway routing rules.

## Error Handling

If any step fails, the gateway returns an error response:

```json
{
  "ok": false,
  "service": "wallet",
  "operation": "deposit",
  "error": {
    "code": "SIGNER_NOT_FOUND",
    "message": "Signer 'my-hot-signer' does not exist",
    "step": "sign"
  }
}
```

The gateway does not retry failed signing or broadcast steps. The client should inspect the error and decide whether to retry.

## Variations

The same pattern applies to all DorkFi actions:

| Action | Endpoint | DorkFi Tool |
|--------|----------|-------------|
| Deposit | `POST /actions/dorkfi/deposit` | `deposit_txn` |
| Borrow | `POST /actions/dorkfi/borrow` | `borrow_txn` |
| Repay | `POST /actions/dorkfi/repay` | `repay_txn` |
| Withdraw | `POST /actions/dorkfi/withdraw` | `withdraw_txn` |

Liquidation follows the same flow but requires additional parameters (`borrower`, `collateral_symbol`, `debt_symbol`).
