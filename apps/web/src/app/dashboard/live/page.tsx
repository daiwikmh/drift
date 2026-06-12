import { LiveBots } from "@/features/trade/components/LiveBots";

export default function LivePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Live bots</h1>
        <p className="mt-1 text-sm text-white/55">
          Deploy a strategy to Bybit testnet and watch fills, equity, and the
          drawdown stop in real time.
        </p>
      </div>
      <LiveBots />
    </div>
  );
}
