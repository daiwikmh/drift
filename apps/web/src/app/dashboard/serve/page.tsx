"use client";

import { useEffect, useRef, useState } from "react";
import { startProvider, type ProviderConfig } from "@/lib/provider";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, btnPrimary, btnGhost, fieldCls, microLabel } from "@/components/dashboard/ui";

type Log = { t: number; line: string; kind?: "in" | "ok" | "warn" };

export default function Serve() {
  const { account, connect, connecting } = useWallet();
  const [skill, setSkill] = useState<"trade-signal" | "llm-inference" | "yield-allocator">("trade-signal");
  const [name, setName] = useState("my-agent");
  const [price, setPrice] = useState("0.001");
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"live" | "offline" | "connecting">("offline");
  const [served, setServed] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);
  const handle = useRef<{ stop: () => void } | null>(null);

  useEffect(() => () => handle.current?.stop(), []);

  const goLive = () => {
    if (!account) return;
    const cfg: ProviderConfig = {
      account,
      name: name.trim() || "my-agent",
      skill,
      priceAvax: Number(price) || 0.001,
      model: model.trim() || undefined,
      openrouterKey: key.trim() || undefined,
    };
    setLogs([]);
    setServed(0);
    handle.current = startProvider(cfg, {
      onLog: (line, kind) => setLogs((l) => [{ t: Date.now(), line, kind }, ...l].slice(0, 60)),
      onServed: () => setServed((n) => n + 1),
      onStatus: setStatus,
    });
  };

  const stop = () => {
    handle.current?.stop();
    handle.current = null;
    setStatus("offline");
  };

  const live = status === "live" || status === "connecting";
  const dot = status === "live" ? "bg-emerald-400" : status === "connecting" ? "bg-amber-400" : "bg-white/30";

  return (
    <div className="mx-auto max-w-3xl px-8 py-9">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Go live as a provider</h1>
          <p className="mt-1 text-sm text-white/45">
            Sell compute straight from this tab. Buyers pay AVAX to unlock each call — you verify &amp; serve, no server, no gas.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px]">
          <span className={`h-2 w-2 rounded-full ${dot} ${status === "live" ? "animate-pulse" : ""}`} />
          {status === "live" ? "live" : status === "connecting" ? "connecting…" : "offline"}
        </div>
      </div>

      {!account ? (
        <Card className="mt-8">
          <h2 className="text-base font-semibold">Connect a wallet</h2>
          <p className="mt-1 text-sm text-white/45">Your wallet address is your provider identity and where payments land.</p>
          <button onClick={connect} disabled={connecting} className={`${btnPrimary} mt-5`}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        </Card>
      ) : (
        <>
          <Card className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={microLabel}>Service</span>
                <select className={`${fieldCls} mt-1.5`} value={skill} disabled={live} onChange={(e) => setSkill(e.target.value as typeof skill)}>
                  <option value="trade-signal">trade-signal (no key needed)</option>
                  <option value="yield-allocator">yield-allocator (no key needed)</option>
                  <option value="llm-inference">llm-inference (OpenRouter key)</option>
                </select>
              </label>
              <label className="block">
                <span className={microLabel}>Agent name</span>
                <input className={`${fieldCls} mt-1.5`} value={name} disabled={live} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block">
                <span className={microLabel}>Price (AVAX / call)</span>
                <input className={`${fieldCls} mt-1.5`} value={price} disabled={live} onChange={(e) => setPrice(e.target.value)} />
              </label>
              <label className="block">
                <span className={microLabel}>Model {skill === "trade-signal" ? "(optional)" : ""}</span>
                <input className={`${fieldCls} mt-1.5`} placeholder="openai/gpt-4o-mini" value={model} disabled={live} onChange={(e) => setModel(e.target.value)} />
              </label>
              {(skill === "llm-inference" || key) && (
                <label className="block sm:col-span-2">
                  <span className={microLabel}>OpenRouter key (stays in your browser){skill === "trade-signal" ? " — optional, refines signals" : ""}</span>
                  <input className={`${fieldCls} mt-1.5`} type="password" placeholder="sk-or-…" value={key} disabled={live} onChange={(e) => setKey(e.target.value)} />
                </label>
              )}
            </div>

            <div className="mt-5 flex items-center gap-3">
              {live ? (
                <button onClick={stop} className={btnGhost}>
                  Stop
                </button>
              ) : (
                <button onClick={goLive} className={btnPrimary} disabled={skill === "llm-inference" && !key.trim()}>
                  Go live
                </button>
              )}
              {status === "live" && (
                <span className="text-[13px] text-white/45">
                  served <span className="font-semibold text-white tabular-nums">{served}</span> · you appear on{" "}
                  <a className="text-[#9aa8f0] hover:underline" href="/dashboard/network">
                    Live network
                  </a>{" "}
                  for everyone
                </span>
              )}
            </div>
            {skill !== "llm-inference" && (
              <p className="mt-3 text-[12px] text-white/35">
                {skill === "trade-signal"
                  ? "No API key needed — real Bybit-grounded momentum signals; add a key to refine with an LLM."
                  : "No API key needed — real DefiLlama-grounded allocations over existing Avalanche vaults."}
              </p>
            )}
          </Card>

          <div className="mb-3 mt-8 text-[11px] uppercase tracking-[0.16em] text-white/30">Live request log</div>
          <Card>
            {logs.length === 0 ? (
              <p className="text-sm text-white/40">{status === "live" ? "Waiting for buyers…" : "Press Go live to start serving."}</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[12px]">
                {logs.map((l, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-white/25">{new Date(l.t).toLocaleTimeString()}</span>
                    <span className={l.kind === "ok" ? "text-emerald-400" : l.kind === "warn" ? "text-[#e84142]" : "text-white/70"}>{l.line}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="mt-6 text-[12px] text-white/35">
            Keep this tab open to stay live — your agent serves straight from the browser, no install. Buyers pay AVAX; custody never touches DRIFT.
          </p>
        </>
      )}
    </div>
  );
}
