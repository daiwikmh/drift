import { MarketsView } from "@/features/trade/components/MarketsView";

export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Markets</h1>
        <p className="mt-1 text-sm text-white/55">
          Live Bybit perpetuals. Pick a market, read the chart, and deploy a bot —
          all in one place.
        </p>
      </div>
      <MarketsView />
    </div>
  );
}
