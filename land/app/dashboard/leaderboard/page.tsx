import { LeaderboardCard } from "../../components/dashboard/panels/LeaderboardCard";
import { StreakCard } from "../../components/dashboard/panels/StreakCard";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-ink/55">
          Weekly pool standing. The top 10 by return share the distributed yield;
          your streak multiplier compounds it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeaderboardCard />
        </div>
        <StreakCard />
      </div>
    </div>
  );
}
