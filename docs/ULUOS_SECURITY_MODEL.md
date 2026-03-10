# UluOS Security Model

## Wallet Boundary
- never public
- gateway-only access
- no key export
- policy checks for every signing request
- audit logs

## Broadcast Boundary
- stateless
- no private keys
- submit and confirm only

## Gateway Boundary
- auth
- billing
- rate limits
- capability permissions
