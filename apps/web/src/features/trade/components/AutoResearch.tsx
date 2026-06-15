"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getConnection, runOptimize, startBot } from "../api";
import type { EquityPoint, OptimizeResult, OptimizeResponse } from "../types";
import { pct } from "@/lib/format";
import { Card, Button, Badge, StatTile } from "@/features/dashboard/components/primitives";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "MNTUSDT"];
const TIMEFRAMES = ["1h", "4h", "1d"];

const verdictTone = { robust: "green", overfit: "amber", weak: "zinc" } as const;
const verdictLabel = { robust: "✓ robust", overfit: "⚠ overfit", weak: "weak" } as const;

export function AutoResearch() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [res, setRes] = useState<OptimizeResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getConnection().then((c) => setConnected(c.connected)).catch(() => setConnected(false));
  }, []);

  const run = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setError(null);
    setRes(null);
    setOpen(null);
    try {
      const r = await runOptimize({ symbol, timeframe, bars: 1000, train_frac: 0.7 }, ac.signal);
      setRes(r);
      if (r.results.length) setOpen(r.results[0].strategy);
    } catch (e) {
      if (!ac.signal.aborted) setError((e as Error).message);
    } finally {
      if (!ac.signal.aborted) setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <Picker label="Market" options={SYMBOLS} value={symbol} onChange={setSymbol} />
          <Picker label="Timeframe" options={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
          <Button variant="primary" onClick={run} disabled={running} className="ml-auto">
            {running ? "Researching…" : "Run Auto-Research"}
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          DRIFT sweeps every strategy across its parameter space, optimises on the
          first 70% of history, then scores the winner on the held-out last 30% it
          never saw. A config that shines in-sample but fails out-of-sample is
          flagged <span className="text-amber-300">overfit</span> — only ones that
          hold up in both are <span className="text-emerald-400">robust</span>.
        </p>
      </Card>

      {error && (
        <Card title="Research failed">
          <p className="py-1 font-mono text-[12px] text-rose-300">{error}</p>
        </Card>
      )}

      {running && !res && (
        <Card>
          <p className="py-12 text-center text-sm text-white/40">
            Sweeping parameter space for {symbol} · {timeframe}…
          </p>
        </Card>
      )}

      {res && (
        <Card
          title="Leaderboard"
          subtitle={`${res.symbol} · ${res.timeframe} · optimised on 70% / scored on held-out 30%`}
        >
          {connected === false && (
            <div className="mb-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-300">
              Not connected — add Bybit keys on Connection to deploy a result.
            </div>
          )}
          <div className="space-y-2">
            {res.results.map((r, i) => (
              <ResultRow
                key={r.strategy}
                rank={i + 1}
                r={r}
                symbol={res.symbol}
                timeframe={res.timeframe}
                open={open === r.strategy}
                onToggle={() => setOpen(open === r.strategy ? null : r.strategy)}
                canDeploy={connected !== false}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ResultRow({
  rank,
  r,
  symbol,
  timeframe,
  open,
  onToggle,
  canDeploy,
}: {
  rank: number;
  r: OptimizeResult;
  symbol: string;
  timeframe: string;
  open: boolean;
  onToggle: () => void;
  canDeploy: boolean;
}) {
  const [deployed, setDeployed] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const params = Object.entries(r.params).map(([k, v]) => `${k} ${v}`).join(" · ");
  const oos = r.out_of_sample;

  const deploy = async () => {
    setErr(null);
    try {
      const bot = await startBot({
        strategy: r.strategy,
        symbol,
        timeframe,
        params: r.params,
        qty: 0.001,
        max_drawdown: 0.2,
      });
      setDeployed(bot.id);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.03]">
        <span className="w-5 shrink-0 font-mono text-[12px] text-white/35">{rank}</span>
        <span className="w-36 shrink-0">
          <span className="block text-[13px] font-semibold text-white">{r.name}</span>
          <span className="block truncate font-mono text-[10px] text-white/40">{params}</span>
        </span>
        <span className="hidden flex-1 items-center gap-4 sm:flex">
          <Metric label="IS Sharpe" value={r.in_sample.sharpe.toFixed(2)} dim />
          <Metric label="OOS Sharpe" value={oos.sharpe.toFixed(2)} good={oos.sharpe >= 0} />
          <Metric label="OOS return" value={pct(oos.total_return)} good={oos.total_return >= 0} />
        </span>
        <Badge tone={verdictTone[r.verdict]}>{verdictLabel[r.verdict]}</Badge>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/10 bg-black/20 p-3">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="OOS return" value={pct(oos.total_return)} accent={oos.total_return >= 0} />
            <StatTile label="OOS Sharpe" value={oos.sharpe.toFixed(2)} accent={oos.sharpe >= 0} />
            <StatTile label="OOS max DD" value={pct(oos.max_drawdown)} />
            <StatTile label="OOS trades" value={oos.num_trades} />
          </div>
          <SplitEquity points={r.equity} split={r.split_index} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={deploy} disabled={!canDeploy || !!deployed}>
              {deployed ? "Deployed" : "Deploy this config"}
            </Button>
            {deployed && (
              <span className="text-[12px] text-emerald-400">
                Bot <span className="font-mono">{deployed}</span> live ·{" "}
                <Link href="/dashboard/bots" className="underline">open console →</Link>
              </span>
            )}
            {err && <span className="font-mono text-[11px] text-rose-300">{err}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// Equity curve with the held-out test region shaded.
function SplitEquity({ points, split }: { points: EquityPoint[]; split: number }) {
  if (points.length < 2) return null;
  const W = 680;
  const H = 150;
  const pad = 8;
  const eqs = points.map((p) => p.equity);
  const min = Math.min(...eqs, 1);
  const max = Math.max(...eqs, 1);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - 2 * pad);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.equity)}`).join(" ");
  const up = points[points.length - 1].equity >= 1;
  const stroke = up ? "#34d399" : "#f87171";
  const splitX = x(split);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Train/test equity">
      {/* test region shading */}
      <rect x={splitX} y={0} width={W - splitX} height={H} fill="#9aa8f0" fillOpacity="0.06" />
      <line x1={splitX} y1={0} x2={splitX} y2={H} stroke="#9aa8f0" strokeOpacity="0.4" strokeDasharray="3 3" />
      <line x1={pad} y1={y(1)} x2={W - pad} y2={y(1)} stroke="white" strokeOpacity="0.12" strokeDasharray="2 3" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <text x={pad + 4} y={14} fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="monospace">train (optimised)</text>
      <text x={splitX + 5} y={14} fontSize="9" fill="#9aa8f0" fontFamily="monospace">test (held out)</text>
    </svg>
  );
}

function Metric({ label, value, good, dim }: { label: string; value: string; good?: boolean; dim?: boolean }) {
  return (
    <span className="leading-tight">
      <span className="block font-mono text-[9px] uppercase tracking-wide text-white/35">{label}</span>
      <span className={`block font-mono text-[13px] tabular-nums ${dim ? "text-white/45" : good ? "text-emerald-400" : "text-rose-400"}`}>
        {value}
      </span>
    </span>
  );
}

function Picker({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-white/45">{label}</div>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition ${
              o === value ? "border-[#9aa8f0] bg-[#9aa8f0] text-[#14152b]" : "border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/[0.07]"
            }`}
          >
            {o.replace("USDT", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
