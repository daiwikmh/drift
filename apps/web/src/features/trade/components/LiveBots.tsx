"use client";

import { useEffect, useRef, useState } from "react";
import {
  botStreamUrl,
  fetchStrategies,
  getConnection,
  listBots,
  startBot,
  stopBot,
} from "../api";
import type { BotConfig, BotStatus, ConnectionStatus, StrategyInfo } from "../types";
import { pct } from "@/lib/format";
import { Card, Button, Badge, StatTile, Row } from "@/features/dashboard/components/primitives";

export function LiveBots() {
  const [conn, setConn] = useState<ConnectionStatus | null>(null);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      getConnection(ac.signal).catch(() => null),
      fetchStrategies(ac.signal).catch(() => []),
      listBots(ac.signal).catch(() => []),
    ]).then(([c, s, b]) => {
      setConn(c);
      setStrategies(s ?? []);
      setBots(b ?? []);
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
    setBots((prev) =>
      prev.map((b) => (b.id === id ? { ...b, running: false } : b)),
    );
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {bots.map((b) => (
            <BotCard key={b.id} initial={b} onKill={() => kill(b.id)} />
          ))}
        </div>
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

function BotCard({ initial, onKill }: { initial: BotStatus; onKill: () => void }) {
  const [bot, setBot] = useState<BotStatus>(initial);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!initial.running) return;
    const ws = new WebSocket(botStreamUrl(initial.id));
    wsRef.current = ws;
    ws.onmessage = (e) => setBot(JSON.parse(e.data));
    return () => ws.close();
  }, [initial.id, initial.running]);

  const sigTone =
    bot.last_signal === "long" ? "green" : bot.last_signal === "short" ? "rose" : "zinc";

  return (
    <Card
      title={`${bot.config.symbol} · ${bot.config.strategy}`}
      subtitle={`${bot.config.timeframe} · qty ${bot.config.qty}`}
      action={
        bot.running ? (
          <Button variant="outline" onClick={onKill} className="!py-1 !text-[12px]">
            Kill
          </Button>
        ) : (
          <Badge tone="zinc">Stopped</Badge>
        )
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Equity" value={`${bot.equity.toFixed(2)}`} />
          <StatTile label="Drawdown" value={pct(bot.drawdown)} />
          <StatTile
            label="Position"
            value={bot.position > 0 ? "Long" : bot.position < 0 ? "Short" : "Flat"}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={sigTone as "green" | "rose" | "zinc"} dot>
            {bot.last_signal ?? "—"}
          </Badge>
          {bot.last_price != null && (
            <span className="font-mono text-[12px] text-white/55">
              @ {bot.last_price.toLocaleString()}
            </span>
          )}
        </div>
        {bot.error && (
          <p className="font-mono text-[11px] text-rose-300">{bot.error}</p>
        )}
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-white/40">
            Fills
          </div>
          {bot.fills.length ? (
            <div className="max-h-32 space-y-0.5 overflow-y-auto">
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
