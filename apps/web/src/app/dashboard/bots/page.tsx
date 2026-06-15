import { LiveBots } from "@/features/trade/components/LiveBots";

export default function BotsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Bots</h1>
        <p className="mt-1 text-sm text-white/55">
          Your live bots on Bybit testnet — chart with entries, equity, P&amp;L, and
          the drawdown stop, streaming in real time.
        </p>
      </div>
      <LiveBots />
    </div>
  );
}
