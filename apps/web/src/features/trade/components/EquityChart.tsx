import type { EquityPoint } from "../types";

// Equity curve (line) with the drawdown envelope shaded below the baseline.
export function EquityChart({ data }: { data: EquityPoint[] }) {
  if (data.length < 2) return null;
  const W = 640;
  const H = 200;
  const pad = { t: 12, r: 8, b: 16, l: 8 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const eqs = data.map((d) => d.equity);
  const min = Math.min(...eqs, 1);
  const max = Math.max(...eqs, 1);
  const span = max - min || 1;

  const x = (i: number) => pad.l + (i / (data.length - 1)) * iw;
  const y = (v: number) => pad.t + (1 - (v - min) / span) * ih;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.equity)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
  const baseY = y(1);
  const end = data[data.length - 1].equity;
  const up = end >= 1;
  const stroke = up ? "#34d399" : "#f87171";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve">
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* baseline (starting equity = 1.0) */}
      <line x1={pad.l} y1={baseY} x2={W - pad.r} y2={baseY} stroke="white" strokeOpacity="0.15" strokeDasharray="3 3" />
      <path d={area} fill="url(#eqfill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

// Standalone drawdown area chart (always ≤ 0).
export function DrawdownChart({ data }: { data: EquityPoint[] }) {
  if (data.length < 2) return null;
  const W = 640;
  const H = 90;
  const pad = { t: 6, r: 8, b: 6, l: 8 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const min = Math.min(...data.map((d) => d.drawdown), -0.0001);
  const x = (i: number) => pad.l + (i / (data.length - 1)) * iw;
  const y = (v: number) => pad.t + (v / min) * ih; // v in [min,0] → [ih,0]

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.drawdown)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${pad.t} L${x(0)},${pad.t} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Drawdown">
      <path d={area} fill="#f87171" fillOpacity="0.12" />
      <path d={line} fill="none" stroke="#f87171" strokeWidth="1.25" strokeOpacity="0.75" />
    </svg>
  );
}
