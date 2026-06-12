"use client";

import { useEffect, useRef, useState } from "react";
import { fetchStrategies, runBacktest } from "../api";
import type { BacktestResponse, StrategyInfo } from "../types";
import { Card, Button, Badge } from "@/features/dashboard/components/primitives";
import { StrategyLibrary } from "./StrategyLibrary";
import { ConfigPanel } from "./ConfigPanel";
import { BacktestResult } from "./BacktestResult";

const defaultsFor = (s: StrategyInfo): Record<string, number> =>
  Object.fromEntries(s.params.map((p) => [p.key, p.default]));

export function Cockpit() {
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [selected, setSelected] = useState<StrategyInfo | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [bars, setBars] = useState(500);
  const [params, setParams] = useState<Record<string, number>>({});

  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchStrategies(ac.signal)
      .then((list) => {
        setStrategies(list);
        if (list.length) {
          setSelected(list[0]);
          setParams(defaultsFor(list[0]));
        }
      })
      .catch((e) => {
        if (!ac.signal.aborted) setEngineError(e.message);
      });
    return () => ac.abort();
  }, []);

  const selectStrategy = (s: StrategyInfo) => {
    setSelected(s);
    setParams(defaultsFor(s));
    setResult(null);
    setRunError(null);
  };

  const run = async () => {
    if (!selected) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setRunError(null);
    try {
      const r = await runBacktest(
        { strategy: selected.id, symbol, timeframe, params, bars },
        ac.signal,
      );
      setResult(r);
    } catch (e) {
      if (!ac.signal.aborted) setRunError((e as Error).message);
    } finally {
      if (!ac.signal.aborted) setRunning(false);
    }
  };

  if (engineError) {
    return (
      <Card title="Engine offline">
        <div className="space-y-3 py-4 text-sm text-white/60">
          <p>
            Could not reach the DRIFT engine. Start it with{" "}
            <span className="font-mono text-white/80">
              uvicorn app.main:app --port 8099
            </span>{" "}
            in <span className="font-mono text-white/80">apps/trader</span>.
          </p>
          <p className="font-mono text-[11px] text-rose-300">{engineError}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* left rail: strategy library + config */}
      <div className="space-y-4">
        <Card title="Strategies" subtitle="Pick one to configure">
          {strategies.length ? (
            <StrategyLibrary
              strategies={strategies}
              selectedId={selected?.id ?? null}
              onSelect={selectStrategy}
            />
          ) : (
            <p className="py-6 text-center text-sm text-white/40">Loading…</p>
          )}
        </Card>

        {selected && (
          <Card title="Configure" subtitle={selected.name}>
            <ConfigPanel
              strategy={selected}
              symbol={symbol}
              timeframe={timeframe}
              bars={bars}
              params={params}
              running={running}
              onSymbol={setSymbol}
              onTimeframe={setTimeframe}
              onBars={setBars}
              onParam={(k, v) => setParams((p) => ({ ...p, [k]: v }))}
              onRun={run}
            />
          </Card>
        )}
      </div>

      {/* results */}
      <div>
        {runError && (
          <Card title="Backtest failed" className="mb-4">
            <p className="py-2 font-mono text-[12px] text-rose-300">{runError}</p>
          </Card>
        )}
        {result ? (
          <BacktestResult result={result} />
        ) : (
          <Card>
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Badge tone="lime" dot>
                Testnet · point-in-time
              </Badge>
              <p className="max-w-sm text-sm text-white/50">
                Configure a strategy on the left and run a backtest against real
                Bybit market history. No look-ahead, honest equity curve.
              </p>
              <Button variant="primary" onClick={run} disabled={!selected || running}>
                {running ? "Running…" : "Run backtest"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
