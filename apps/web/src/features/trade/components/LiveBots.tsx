"use client";

import { useEffect, useRef, useState } from "react";
import {
  botStreamUrl,
  fetchKlines,
  fetchStrategies,
  getChain,
  getConnection,
  getRegime,
  listBots,
  startBot,
  stopBot,
} from "../api";
import type {
  BotConfig,
  BotStatus,
  Candle,
  ChainInfo,
  ConnectionStatus,
  RegimeInfo,
  StrategyInfo,
} from "../types";
import { pct } from "@/lib/format";
import { Card, Button, Badge, StatTile, Row } from "@/features/dashboard/components/primitives";
import { CandleChart, type ChartMarker } from "./CandleChart";

export function LiveBots() {
  const [conn, setConn] = useState<ConnectionStatus | null>(null);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [chain, setChain] = useState<ChainInfo | null>(null);
  const [regime, setRegime] = useState<RegimeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      getConnection(ac.signal).catch(() => null),
      fetchStrategies(ac.signal).catch(() => []),
      listBots(ac.signal).catch(() => []),
      getChain(ac.signal).catch(() => null),
      getRegime(ac.signal).catch(() => null),
    ]).then(([c, s, b, ch, rg]) => {
      setConn(c);
      setStrategies(s ?? []);
      setBots(b ?? []);
      setChain(ch);
      setRegime(rg);
    });
    return () => ac.abort();
  }, []);

  const launch = async (cfg: BotConfig) => {
    setError(null);
    try {
      const bot = await startBot(cfg);
      setBots((prev) => [...prev, bot]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const kill = async (id: string) => {
    await stopBot(id).catch(() => {});
    setBots((prev) => prev.filter((b) => b.id !== id));
  };

  if (conn && !conn.connected) {
    return (
      <Card title="Not connected">
        <div className="space-y-3 py-4 text-sm text-white/55">
          <Badge tone="amber" dot>
            Bybit keys required
          </Badge>
          <p>
            Live bots place real orders on Bybit testnet. Add your keys on the{" "}
            <span className="font-mono text-white/70">Connection</span> tab first.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {chain?.enabled && <GuardBanner chain={chain} regime={regime} />}
      <LaunchForm strategies={strategies} onLaunch={launch} />
      {error && (
        <Card title="Launch failed">
          <p className="py-1 font-mono text-[12px] text-rose-300">{error}</p>
        </Card>
      )}
      {bots.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm text-white/45">
            No bots running. Configure one above to start trading on testnet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {bots.map((b) => (
            <BotCard key={b.id} initial={b} chain={chain} onKill={() => kill(b.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function GuardBanner({ chain, regime }: { chain: ChainInfo; regime: RegimeInfo | null }) {
  const short = chain.address
    ? `${chain.address.slice(0, 6)}…${chain.address.slice(-4)}`
    : "—";
  const regimeTone =
    regime?.label === "risk-on" ? "green" : regime?.label === "risk-off" ? "rose" : "zinc";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[#9aa8f0]/25 bg-[#9aa8f0]/[0.06] px-3.5 py-2.5 text-[12px]">
      <Badge tone="green" dot>
        on-chain
      </Badge>
      <span className="text-white/70">
        MacroGuard enforcing risk on{" "}
        <span className="text-white/90">Mantle</span> · every decision recorded on-chain
      </span>
      {regime && (
        <span className="flex items-center gap-1.5">
          <span className="text-white/35">·</span>
          <span className="text-white/45">regime</span>
          <Badge tone={regimeTone as "green" | "rose" | "zinc"} dot>
            {regime.label}
          </Badge>
        </span>
      )}
      {chain.explorer && (
        <a
          href={chain.explorer}
          target="_blank"
          rel="noreferrer"
          className="ml-auto font-mono text-[#9aa8f0] underline-offset-2 hover:underline"
        >
          {short} ↗
        </a>
      )}
    </div>
  );
}

function LaunchForm({
  strategies,
  onLaunch,
}: {
  strategies: StrategyInfo[];
  onLaunch: (cfg: BotConfig) => void;
}) {
  const [strategy, setStrategy] = useState("");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [qty, setQty] = useState(0.001);
  const [maxDd, setMaxDd] = useState(0.2);

  useEffect(() => {
    if (!strategy && strategies.length) setStrategy(strategies[0].id);
  }, [strategies, strategy]);

  const selected = strategies.find((s) => s.id === strategy);
  const params = selected
    ? Object.fromEntries(selected.params.map((p) => [p.key, p.default]))
    : {};

  return (
    <Card title="Deploy a bot" subtitle="Real market orders on Bybit testnet">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Select label="Strategy" value={strategy} onChange={setStrategy}
          options={strategies.map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Symbol" value={symbol} onChange={setSymbol}
          options={["BTCUSDT", "ETHUSDT", "SOLUSDT"].map((s) => ({ value: s, label: s }))} />
        <Select label="Timeframe" value={timeframe} onChange={setTimeframe}
          options={["15m", "1h", "4h"].map((s) => ({ value: s, label: s }))} />
        <NumberField label="Qty" value={qty} step={0.001} min={0.001}
          onChange={setQty} />
        <NumberField label="Max DD" value={maxDd} step={0.05} min={0.05} max={1}
          onChange={setMaxDd} />
      </div>
      <Button
        variant="primary"
        className="mt-4 w-full"
        disabled={!strategy}
        onClick={() => onLaunch({ strategy, symbol, timeframe, params, qty, max_drawdown: maxDd })}
      >
        Deploy to testnet
      </Button>
    </Card>
  );
}

function BotCard({
  initial,
  chain,
  onKill,
}: {
  initial: BotStatus;
  chain: ChainInfo | null;
  onKill: () => void;
}) {
  const [bot, setBot] = useState<BotStatus>(initial);
  const [candles, setCandles] = useState<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Keep the stream open regardless of running state so a kill/stop is reflected
  // live (the engine streams status every second, including after a stop).
  useEffect(() => {
    const ws = new WebSocket(botStreamUrl(initial.id));
    wsRef.current = ws;
    ws.onmessage = (e) => setBot(JSON.parse(e.data));
    return () => ws.close();
  }, [initial.id]);

  // keep the bot's chart fresh
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchKlines(initial.config.symbol, initial.config.timeframe, 120)
        .then((r) => alive && setCandles(r.candles))
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [initial.config.symbol, initial.config.timeframe]);

  const sigTone =
    bot.last_signal === "long" ? "green" : bot.last_signal === "short" ? "rose" : "zinc";

  const markers: ChartMarker[] = bot.fills.map((f) => ({
    time: f.ts,
    price: f.price,
    side: f.flatten || f.target === 0 ? "exit" : f.target > 0 ? "long" : "short",
  }));

  const pnl = bot.peak_equity > 0 ? bot.equity / bot.peak_equity - 1 : 0;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span className="font-mono">{bot.config.symbol}</span>
          <span className="text-white/35">·</span>
          <span className="text-white/60">{bot.config.strategy}</span>
          {bot.running ? (
            <Badge tone="green" dot>live</Badge>
          ) : (
            <Badge tone="zinc">stopped</Badge>
          )}
        </span>
      }
      subtitle={`${bot.config.timeframe} · qty ${bot.config.qty} · max DD ${pct(bot.config.max_drawdown, 0)}`}
      action={
        <Button variant="outline" onClick={onKill} className="!py-1 !text-[12px]">
          {bot.running ? "Kill" : "Dismiss"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        {/* chart */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <CandleChart candles={candles} markers={markers} height={240} />
        </div>

        {/* stats + fills */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Equity" value={bot.equity.toFixed(2)} />
            <StatTile label="P&L" value={pct(pnl)} accent={pnl >= 0} />
            <StatTile label="Drawdown" value={pct(bot.drawdown)} />
            <StatTile
              label="Position"
              value={bot.position > 0 ? "Long" : bot.position < 0 ? "Short" : "Flat"}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={sigTone as "green" | "rose" | "zinc"} dot>
              {bot.last_signal ?? "—"}
            </Badge>
            {bot.last_price != null && (
              <span className="font-mono text-[12px] text-white/55">
                @ {bot.last_price.toLocaleString()}
              </span>
            )}
            {bot.chain_vetoed && (
              <Badge tone="amber" dot>
                macro veto
              </Badge>
            )}
          </div>
          {chain?.enabled && (
            <div className="flex items-center gap-1.5 text-[11px] text-white/45">
              <span className="text-[#9aa8f0]">⛓</span>
              {bot.last_chain_tx ? (
                <a
                  href={`${chain.explorer_base}/tx/${bot.last_chain_tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[#9aa8f0] underline-offset-2 hover:underline"
                >
                  decision logged {bot.last_chain_tx.slice(0, 10)}… ↗
                </a>
              ) : (
                <span>awaiting first on-chain decision…</span>
              )}
            </div>
          )}
          {bot.error &&
            (/10005|permission denied/i.test(bot.error) ? (
              <p className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-300">
                Your Bybit keys are <b>read-only</b>. Live orders need a key with{" "}
                <b>trade</b> permission (and a funded testnet balance).
              </p>
            ) : (
              <p className="font-mono text-[11px] text-rose-300">{bot.error}</p>
            ))}
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-white/40">Fills</div>
            {bot.fills.length ? (
              <div className="max-h-28 space-y-0.5 overflow-y-auto">
                {[...bot.fills].reverse().map((f, i) => (
                  <Row
                    key={i}
                    label={
                      <span className={f.side === "Buy" ? "text-emerald-400" : "text-rose-300"}>
                        {f.side} {f.qty}
                        {f.flatten ? " (flat)" : ""}
                      </span>
                    }
                    value={f.price?.toLocaleString() ?? "—"}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">No fills yet — waiting for a signal.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-[13px] text-white outline-none focus:border-[#9aa8f0]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0c0d10]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/45">
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 font-mono text-[13px] text-white outline-none focus:border-[#9aa8f0]"
      />
    </label>
  );
}
