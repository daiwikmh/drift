import type { ConstraintState, RebalanceProposal, VenueSignal } from "./types";

// The Optimizer seam: v1 is a transparent risk-adjusted scorer; an RL policy
// can replace this implementation later without touching collect/execute.
export interface Optimizer {
  propose(
    venues: VenueSignal[],
    constraints: ConstraintState,
  ): RebalanceProposal | undefined;
}

// v1: allocate toward the highest observed supply APY, subject to constraints.
// Returns undefined when there isn't enough real signal to act on — the agent
// then does nothing rather than guessing.
export class GreedyRiskAdjustedOptimizer implements Optimizer {
  propose(
    venues: VenueSignal[],
    constraints: ConstraintState,
  ): RebalanceProposal | undefined {
    const scored = venues.filter((v) => v.supplyApy != null);
    if (scored.length === 0) return undefined;

    const investableBps = 10_000 - constraints.treasuryFloorBps;
    const best = scored.reduce((a, b) =>
      (b.supplyApy ?? 0) > (a.supplyApy ?? 0) ? b : a,
    );

    return {
      targets: [{ asset: best.asset, weightBps: investableBps }],
      reason:
        `Allocating ${(investableBps / 100).toFixed(1)}% to ${best.symbol} at ` +
        `${((best.supplyApy ?? 0) * 100).toFixed(2)}% supply APY — highest among ` +
        `${scored.length} whitelisted venue(s); treasury floor ` +
        `${(constraints.treasuryFloorBps / 100).toFixed(1)}% held back.`,
    };
  }
}
