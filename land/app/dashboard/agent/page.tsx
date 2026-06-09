import { AgentPanel } from "../../components/dashboard/panels/AgentPanel";
import { AllocationCard } from "../../components/dashboard/panels/AllocationCard";

export default function AgentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Agent</h1>
        <p className="mt-1 text-sm text-ink/55">
          The reinforcement-learning allocation engine — its live constraints,
          what it&apos;s watching, performance vs benchmark, and rebalance log.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgentPanel />
        <AllocationCard />
      </div>
    </div>
  );
}
