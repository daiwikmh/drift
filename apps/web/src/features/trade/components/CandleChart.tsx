import type { Candle } from "../types";

export type ChartMarker = { time: number; side: "long" | "short" | "exit"; price: number };

const UP = "#34d399";
const DOWN = "#f87171";

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toPrecision(4);
}

// SVG candlestick with a volume strip, right-hand price axis, last-price line,
// and optional entry/exit markers. Dark theme.
export function CandleChart({
  candles,
  markers = [],
  height = 320,
}: {
  candles: Candle[];
  markers?: ChartMarker[];
  height?: number;
}) {
  if (candles.length < 2) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-white/30">
        No price data.
      </div>
    );
  }

  const W = 760;
  const H = height;
  const gutter = 52; // right price axis
  const padT = 10;
  const volH = Math.round(H * 0.16);
  const priceBottom = H - volH - 22;
  const plotW = W - gutter - 8;

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  let pMin = Math.min(...lows);
  let pMax = Math.max(...highs);
  const padP = (pMax - pMin) * 0.06 || pMax * 0.01;
  pMin -= padP;
  pMax += padP;
  const maxVol = Math.max(...candles.map((c) => c.volume), 1);

  const n = candles.length;
  const slot = plotW / n;
  const bw = Math.max(1, slot * 0.62);
  const cx = (i: number) => 8 + i * slot + slot / 2;
  const y = (p: number) => padT + (1 - (p - pMin) / (pMax - pMin)) * (priceBottom - padT);
  const vy = (v: number) => priceBottom + 14 + (1 - v / maxVol) * (volH - 4);

  const last = candles[n - 1].close;
  const lastY = y(last);
  const lastUp = last >= candles[n - 1].open;

  // map fill time → candle index (nearest not-after)
  const idxForTime = (t: number) => {
    let lo = 0;
    for (let i = 0; i < n; i++) if (candles[i].time <= t) lo = i;
    return lo;
  };

  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => pMin + ((pMax - pMin) * i) / gridLines);

  const markerColor = (s: ChartMarker["side"]) =>
    s === "long" ? UP : s === "short" ? DOWN : "#fbbf24";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Candlestick chart">
      {/* gridlines + price axis */}
      {ticks.map((p, i) => (
        <g key={i}>
          <line x1={8} y1={y(p)} x2={W - gutter} y2={y(p)} stroke="white" strokeOpacity="0.05" />
          <text x={W - gutter + 6} y={y(p) + 3} fontSize="9" fill="rgba(255,255,255,0.4)" fontFamily="monospace">
            {fmtPrice(p)}
          </text>
        </g>
      ))}

      {/* candles */}
      {candles.map((c, i) => {
        const up = c.close >= c.open;
        const col = up ? UP : DOWN;
        const x = cx(i);
        const bodyTop = y(Math.max(c.open, c.close));
        const bodyH = Math.max(1, Math.abs(y(c.open) - y(c.close)));
        return (
          <g key={i}>
            <line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} stroke={col} strokeOpacity="0.7" strokeWidth="1" />
            <rect x={x - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={col} fillOpacity="0.85" />
            <rect x={x - bw / 2} y={vy(c.volume)} width={bw} height={priceBottom + 14 + volH - vy(c.volume)} fill={col} fillOpacity="0.18" />
          </g>
        );
      })}

      {/* last price line */}
      <line x1={8} y1={lastY} x2={W - gutter} y2={lastY} stroke={lastUp ? UP : DOWN} strokeOpacity="0.5" strokeDasharray="3 3" />
      <rect x={W - gutter} y={lastY - 7} width={gutter} height={14} fill={lastUp ? UP : DOWN} fillOpacity="0.9" rx="2" />
      <text x={W - gutter + 5} y={lastY + 3} fontSize="9" fill="#0b0c0f" fontFamily="monospace" fontWeight="bold">
        {fmtPrice(last)}
      </text>

      {/* markers */}
      {markers.map((m, i) => {
        const x = cx(idxForTime(m.time));
        const my = y(m.price);
        const col = markerColor(m.side);
        if (m.side === "exit") {
          return <circle key={i} cx={x} cy={my} r="3" fill="none" stroke={col} strokeWidth="1.4" />;
        }
        const d =
          m.side === "long"
            ? `M${x},${my + 9} l-5,8 l10,0 Z`
            : `M${x},${my - 9} l-5,-8 l10,0 Z`;
        return <path key={i} d={d} fill={col} />;
      })}
    </svg>
  );
}
