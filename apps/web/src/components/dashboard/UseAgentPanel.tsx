"use client";

import { useState } from "react";
import { buyInference, EXPLORER, type BuyResult, type Provider } from "@/lib/market";
import { giveFeedback } from "@/lib/chain";
import { addSignal } from "@/lib/signals";
import { useWallet } from "./WalletContext";
import { btnPrimary, fieldCls, microLabel } from "./ui";

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const repText = (p: Provider) =>
  p.agentId === undefined ? "off-chain" : !p.rep ? "★ —" : p.rep.count ? `★${p.rep.avg.toFixed(0)} (${p.rep.count})` : "★ new";

// Self-contained "use this agent" form — runs a prompt against one provider and
// pays in AVAX. Used by the Live Network drawer.
export function UseAgentPanel({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const { account, connect, connecting, refreshBalances } = useWallet();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<BuyResult | null>(null);
  const [feedbackTx, setFeedbackTx] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!account || !prompt.trim()) return;
    setBusy(true);
    setError(null);
    setOut(null);
    setFeedbackTx(null);
    try {
      const res = await buyInference(provider.endpoint, prompt.trim(), account, model.trim() || undefined);
      setOut(res);
      refreshBalances();
      if (res.signal) {
        addSignal(account, {
          id: crypto.randomUUID(),
          provider: provider.addr,
          agentId: provider.agentId,
          signal: res.signal,
          boughtAt: Math.floor(Date.now() / 1000),
        });
      } else if (provider.agentId !== undefined) {
        try {
          setFeedbackTx(await giveFeedback(account, provider.agentId, 100));
        } catch {
          /* best-effort */
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <h2 className="text-lg font-semibold">{provider.name}</h2>
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">{repText(provider)}</span>
          </div>
          <div className="mt-1.5 text-[12px] text-white/40">
            {provider.skills[0] ?? "compute"} · {provider.model ?? "model —"} ·{" "}
            {provider.agentId !== undefined ? `#${provider.agentId}` : "off-chain"} · {short(provider.addr)}
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 inline-flex rounded-full border border-[#e84142]/40 px-3 py-1 text-[12px] text-[#e84142]">
          {provider.priceAvax ?? "?"} AVAX / call
        </div>

        <label className="block">
          <span className={microLabel}>Prompt</span>
          <textarea
            className={`${fieldCls} mt-1.5 min-h-[110px] resize-y`}
            placeholder={provider.skills[0] === "trade-signal" ? "e.g. signal for ETH" : "Your prompt…"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoFocus
          />
        </label>
        <label className="mt-3 block">
          <span className={microLabel}>Model override (optional)</span>
          <input className={`${fieldCls} mt-1.5`} placeholder="e.g. anthropic/claude-3.5-sonnet" value={model} onChange={(e) => setModel(e.target.value)} />
        </label>

        <div className="mt-4">
          {account ? (
            <button className={`${btnPrimary} w-full`} disabled={!prompt.trim() || busy} onClick={run}>
              {busy ? "Paying AVAX…" : `Pay ${provider.priceAvax ?? ""} AVAX & run`}
            </button>
          ) : (
            <button className={`${btnPrimary} w-full`} onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>

        {error && <div className="mt-4 text-[13px] text-[#e84142]">⚠ {error}</div>}

        {out && (
          <div className="mt-6 border-t border-white/10 pt-5">
            {out.signal && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <span
                  className="rounded-md px-2 py-1 text-[12px] font-bold"
                  style={{
                    background: out.signal.direction === "short" ? "rgba(232,65,66,0.15)" : "rgba(52,211,153,0.15)",
                    color: out.signal.direction === "short" ? "#e84142" : "#34d399",
                  }}
                >
                  {out.signal.direction.toUpperCase()}
                </span>
                <span className="font-mono text-[13px] text-white/80">{out.signal.symbol}</span>
                <span className="text-[12px] text-white/45">entry ${out.signal.entryPrice}</span>
                <span className="text-[12px] text-white/45">{out.signal.horizonHours}h</span>
                <span className="ml-auto text-[11px] text-[#9aa8f0]">recorded → My signals</span>
              </div>
            )}
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/90">{out.result}</div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
              {out.txHash && (
                <a className="text-emerald-400 hover:underline" href={`${EXPLORER}/tx/${out.txHash}`} target="_blank" rel="noreferrer">
                  paid · {short(out.txHash)} ↗
                </a>
              )}
              {feedbackTx && (
                <a className="text-emerald-400 hover:underline" href={`${EXPLORER}/tx/${feedbackTx}`} target="_blank" rel="noreferrer">
                  ★ reputation · {short(feedbackTx)} ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
