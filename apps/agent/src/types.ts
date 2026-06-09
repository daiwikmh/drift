import type { Address } from "viem";

// A yield venue the agent can allocate into, with the signals that drive
// scoring. Signals are real reads or absent — never fabricated.
export type VenueSignal = {
  asset: Address;
  symbol: string;
  supplyApy: number | undefined;
  price: number | undefined;
};

export type Allocation = { asset: Address; weightBps: number };

// What the optimizer hands to the executor: target weights plus the
// human-readable reason that gets hashed on-chain and stored in full off-chain.
export type RebalanceProposal = {
  targets: Allocation[];
  reason: string;
};

export type ConstraintState = {
  treasuryFloorBps: number;
  correlationCapBps: number;
  maxRebalanceBps: number;
  nextEvalTimestamp: number;
};
