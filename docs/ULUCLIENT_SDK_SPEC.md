# UluClient SDK Spec

## Example

```ts
const client = new UluClient({
  gateway: "https://api.uluos.io",
  apiKey: process.env.ULUOS_API_KEY
});

await client.execute("core.getAccount", {
  address: "SOMEADDRESS",
  chain: "algorand"
});
```
