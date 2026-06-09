import { PositionCard } from "../../components/dashboard/panels/PositionCard";
import { AllocationCard } from "../../components/dashboard/panels/AllocationCard";
import { DepositCard } from "../../components/dashboard/panels/DepositCard";
import { StreakCard } from "../../components/dashboard/panels/StreakCard";

export default function VaultPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Vault</h1>
        <p className="mt-1 text-sm text-ink/55">
          Deposit into the ERC-4626 vault, watch it drip, and review the
          agent&apos;s current allocation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PositionCard />
          <AllocationCard />
        </div>
        <div className="space-y-4">
          <DepositCard />
          <StreakCard />
        </div>
      </div>
    </div>
  );
}
