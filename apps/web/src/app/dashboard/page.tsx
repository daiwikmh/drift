import { PositionCard } from "@/features/dashboard/components/panels/PositionCard";
import { AllocationCard } from "@/features/dashboard/components/panels/AllocationCard";
import { StreakCard } from "@/features/dashboard/components/panels/StreakCard";
import { LeaderboardCard } from "@/features/dashboard/components/panels/LeaderboardCard";
import { DepositCard } from "@/features/dashboard/components/panels/DepositCard";
import { AgentPanel } from "@/features/dashboard/components/panels/AgentPanel";

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
