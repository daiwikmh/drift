import type { BacktestResponse } from "../types";
import { pct } from "@/lib/format";
import { Card, StatTile } from "@/features/dashboard/components/primitives";
import { EquityChart, DrawdownChart } from "./EquityChart";
import { PriceChart } from "./PriceChart";

export function BacktestResult({ result }: { result: BacktestResponse }) {
  const m = result.metrics;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile
          label="Total return"
          value={pct(m.total_return)}
          accent={m.total_return >= 0}
        />
        <StatTile label="Sharpe" value={m.sharpe.toFixed(2)} accent={m.sharpe >= 0} />
        <StatTile label="Win rate" value={pct(m.win_rate, 0)} />
        <StatTile label="Max DD" value={pct(m.max_drawdown)} />
        <StatTile label="Trades" value={m.num_trades} />
      </div>

      <Card title="Equity curve" subtitle="Growth of 1.0 · point-in-time, no look-ahead">
        <EquityChart data={result.equity_curve} />
      </Card>

      <Card title="Drawdown">
        <DrawdownChart data={result.equity_curve} />
      </Card>

      <Card
        title={`${result.symbol} · ${result.timeframe}`}
        subtitle="Close price with entries (▲ long · ▼ short · ○ exit)"
      >
        <PriceChart candles={result.candles} trades={result.trades} />
      </Card>
    </div>
  );
}
