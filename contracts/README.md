# DRIP contracts

Frozen interface spec for the on-chain layer. The frontend (`@drip/web`) and
agent worker (`@drip/agent`) both code against the ABIs in `@drip/shared`,
which mirror `src/interfaces/` 1:1 — any change here must land in both places.

## Trust model

- **Users** deposit/withdraw via `IDripVault` (ERC-4626) and only there.
- **The agent key** can call exactly one state-changing function:
  `IAgentController.rebalance`. It can never withdraw or transfer out.
- **Governance** curates the `IAssetRegistry` whitelist, sets constraint
  bounds, rotates the agent key, and can pause.

## Invariants enforced by `rebalance` (revert on violation)

| # | Invariant |
|---|-----------|
| I1 | treasury share after rebalance ≥ `treasuryFloorBps` |
| I2 | portfolio ETH-correlation after rebalance ≤ `correlationCapBps` |
| I3 | total weight moved per call ≤ `maxRebalanceBps` |
| I4 | every target asset whitelisted + weight ≤ registry `capBps` |
| I5 | Σ weights + treasury == 10 000 bps |
| I6 | one rebalance per epoch (`nextEvalTimestamp`) |
| I7 | caller == registered agent key |

The human-readable rationale for each rebalance is stored off-chain (DA) and
committed on-chain as `reasonHash` in the `Rebalance` event.

## Build

```
forge build
```
