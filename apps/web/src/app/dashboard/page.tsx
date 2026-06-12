import { Cockpit } from "@/features/trade/components/Cockpit";

export default function BacktestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Backtest</h1>
        <p className="mt-1 text-sm text-white/55">
          Browse strategies, configure parameters, and backtest against real Bybit
          market history before going live.
        </p>
      </div>
      <Cockpit />
    </div>
  );
}
