import { addresses } from "@drip/shared";
import { activeChain } from "./chain";
import { collectConstraints, collectVenues } from "./collect";
import { GreedyRiskAdjustedOptimizer } from "./optimizer";

// Epoch loop: collect → propose → (execute — not yet wired; the proposal is
// logged so the pipeline can be dry-run end-to-end before any key exists).
const EPOCH_MS = 60_000;
const optimizer = new GreedyRiskAdjustedOptimizer();

async function tick() {
  const constraints = await collectConstraints();
  if (!constraints) {
    console.log(
      `[agent] awaiting deployment — set NEXT_PUBLIC_AGENT_CONTROLLER (chain: ${activeChain.name})`,
    );
    return;
  }

  const venues = await collectVenues();
  const proposal = optimizer.propose(venues, constraints);
  if (!proposal) {
    console.log(`[agent] no actionable signal across ${venues.length} venue(s); holding.`);
    return;
  }

  // TODO(phase 5): simulate, sign with the scoped agent key, submit
  // AgentController.rebalance(targets, reasonHash), persist full reason to DA.
  console.log("[agent] proposal (dry run):", JSON.stringify(proposal, null, 2));
}

async function main() {
  console.log(
    `[agent] starting on ${activeChain.name}; controller=${addresses.agentController ?? "unset"}`,
  );
  await tick();
  if (process.argv.includes("--once")) return;
  setInterval(() => void tick().catch((e) => console.error("[agent] tick failed:", e)), EPOCH_MS);
}

void main();
