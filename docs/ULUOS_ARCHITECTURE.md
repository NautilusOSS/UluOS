# UluOS Architecture

## Layer Model

```text
            UluGateway
         (Control Plane)

               │
          Protocol Layer
  DorkFiMCP | EnvoiMCP | AramidMCP

               │
       Ecosystem Meaning Layer
     UluVoiMCP | UluAlgorandMCP

               │
         Infrastructure Layer
   CoreMCP | WalletMCP | BroadcastMCP
```

## Principle

External consumers should talk only to UluGateway.
