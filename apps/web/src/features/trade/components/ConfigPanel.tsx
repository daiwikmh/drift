import type { StrategyInfo } from "../types";
import { Button } from "@/features/dashboard/components/primitives";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "MNTUSDT"];
const TIMEFRAMES = ["15m", "1h", "4h", "1d"];

export function ConfigPanel({
  strategy,
  symbol,
  timeframe,
  bars,
  params,
  running,
  onSymbol,
  onTimeframe,
  onBars,
  onParam,
  onRun,
}: {
  strategy: StrategyInfo;
  symbol: string;
  timeframe: string;
  bars: number;
  params: Record<string, number>;
  running: boolean;
  onSymbol: (s: string) => void;
  onTimeframe: (t: string) => void;
  onBars: (n: number) => void;
  onParam: (key: string, v: number) => void;
  onRun: () => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Symbol">
        <Segmented options={SYMBOLS} value={symbol} onChange={onSymbol} />
      </Field>

      <Field label="Timeframe">
        <Segmented options={TIMEFRAMES} value={timeframe} onChange={onTimeframe} />
      </Field>

      <Field label={`History — ${bars} bars`}>
        <input
          type="range"
          min={100}
          max={1000}
          step={50}
          value={bars}
          onChange={(e) => onBars(Number(e.target.value))}
          className="w-full accent-[#9aa8f0]"
        />
      </Field>

      {strategy.params.map((p) => (
        <Field key={p.key} label={`${p.label} — ${params[p.key] ?? p.default}`}>
          <input
            type="range"
            min={p.min}
            max={p.max}
            step={p.step}
            value={params[p.key] ?? p.default}
            onChange={(e) => onParam(p.key, Number(e.target.value))}
            className="w-full accent-[#9aa8f0]"
          />
        </Field>
      ))}

      <Button variant="primary" className="w-full" onClick={onRun} disabled={running}>
        {running ? "Running backtest…" : "Run backtest"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-white/45">
        {label}
      </div>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition ${
            o === value
              ? "border-[#9aa8f0] bg-[#9aa8f0] text-[#14152b]"
              : "border-white/15 bg-white/[0.04] text-white/60 hover:bg-white/[0.06]"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
