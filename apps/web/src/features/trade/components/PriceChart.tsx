import type { Candle, TradeMarker } from "../types";

// Close-price line with long/short/exit trade markers overlaid.
export function PriceChart({
  candles,
  trades,
}: {
  candles: Candle[];
  trades: TradeMarker[];
}) {
  if (candles.length < 2) return null;
  const W = 640;
  const H = 220;
  const pad = { t: 12, r: 8, b: 16, l: 8 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const t0 = candles[0].time;
  const tN = candles[candles.length - 1].time;
  const tspan = tN - t0 || 1;

  const x = (t: number) => pad.l + ((t - t0) / tspan) * iw;
  const y = (v: number) => pad.t + (1 - (v - min) / span) * ih;

  const line = candles.map((c, i) => `${i === 0 ? "M" : "L"}${x(c.time)},${y(c.close)}`).join(" ");

  const colorFor = (side: TradeMarker["side"]) =>
    side === "long" ? "#34d399" : side === "short" ? "#f87171" : "#fbbf24";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Price with trades">
      <path d={line} fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="1.25" />
      {trades.map((tr, i) => {
        const cx = x(tr.time);
        const cy = y(tr.price);
        const c = colorFor(tr.side);
        if (tr.side === "exit") {
          return <circle key={i} cx={cx} cy={cy} r="2.4" fill="none" stroke={c} strokeWidth="1.2" />;
        }
        // up triangle for long, down triangle for short
        const d =
          tr.side === "long"
            ? `M${cx},${cy - 5} L${cx - 4},${cy + 3} L${cx + 4},${cy + 3} Z`
            : `M${cx},${cy + 5} L${cx - 4},${cy - 3} L${cx + 4},${cy - 3} Z`;
        return <path key={i} d={d} fill={c} />;
      })}
    </svg>
  );
}
