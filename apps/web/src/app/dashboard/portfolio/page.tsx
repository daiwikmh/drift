import { Portfolio } from "@/features/trade/components/Portfolio";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Portfolio</h1>
        <p className="mt-1 text-sm text-white/55">
          Your account, running bots, open positions, and live P&amp;L at a glance.
        </p>
      </div>
      <Portfolio />
    </div>
  );
}
