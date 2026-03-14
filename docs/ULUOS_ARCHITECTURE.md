# UluOS Architecture

## Layer Model

```text
                  UluGateway
               (Control Plane)

                      │
              Protocol Layer
   Voi:         HumbleMCP | NomadexMCP | EnvoiMCP | MimirMCP
   Cross-chain: AramidMCP | DorkFiMCP
   Algorand:    PactFiMCP | HumbleLegacyMCP

                      │
            Ecosystem Meaning Layer
          UluVoiMCP | UluAlgorandMCP

                      │
              Infrastructure Layer
        CoreMCP | WalletMCP | BroadcastMCP
```

## Principle

External consumers should talk only to UluGateway.
