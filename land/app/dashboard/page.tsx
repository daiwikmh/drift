import { PositionCard } from "../components/dashboard/panels/PositionCard";
import { AllocationCard } from "../components/dashboard/panels/AllocationCard";
import { StreakCard } from "../components/dashboard/panels/StreakCard";
import { LeaderboardCard } from "../components/dashboard/panels/LeaderboardCard";
import { DepositCard } from "../components/dashboard/panels/DepositCard";
import { AgentPanel } from "../components/dashboard/panels/AgentPanel";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink/55">
          Your DRIP position, the agent&apos;s live allocation, and pool standing
          at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PositionCard />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AllocationCard />
            <StreakCard />
          </div>
          <LeaderboardCard />
        </div>

        <div className="space-y-4">
          <DepositCard />
          <AgentPanel />
        </div>
      </div>
    </div>
  );
}
