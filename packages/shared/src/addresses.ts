import { type Address, isAddress } from "viem";

// --- Address registry (env-driven) ---------------------------------------
// Every DRIP contract address comes from a NEXT_PUBLIC_* env var (the same
// names drive both the web app and the agent worker). Until a real address is
// set, the corresponding reads stay disabled and the UI shows an "awaiting
// deployment" state instead of inventing numbers.

function envAddr(v: string | undefined): Address | undefined {
  return v && isAddress(v) ? (v as Address) : undefined;
}

export const addresses = {
  dripVault: envAddr(process.env.NEXT_PUBLIC_DRIP_VAULT),
  dripPool: envAddr(process.env.NEXT_PUBLIC_DRIP_POOL),
  agentController: envAddr(process.env.NEXT_PUBLIC_AGENT_CONTROLLER),
  streakManager: envAddr(process.env.NEXT_PUBLIC_STREAK_MANAGER),
  reputationRegistry: envAddr(process.env.NEXT_PUBLIC_REPUTATION_REGISTRY),
  assetRegistry: envAddr(process.env.NEXT_PUBLIC_ASSET_REGISTRY),
  // The agent's ERC-8004-bound signing key (EOA), used to look up its reputation.
  agent: envAddr(process.env.NEXT_PUBLIC_AGENT_ADDRESS),
  // External protocols (optional; off until provided).
  aaveDataProvider: envAddr(process.env.NEXT_PUBLIC_AAVE_DATA_PROVIDER),
} as const;

// Optional off-chain endpoints.
export const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL || undefined;
