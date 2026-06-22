"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buyInference,
  EXPLORER,
  getCard,
  listProviders,
  type BuyResult,
  type Card as ProviderCard,
  type Provider,
} from "@/lib/market";
import { giveFeedback } from "@/lib/chain";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Stat, btnPrimary, fieldCls, microLabel } from "@/components/dashboard/ui";

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const repText = (p: Provider) =>
  p.agentId === undefined ? "off-chain" : !p.rep ? "★ —" : p.rep.count ? `★${p.rep.avg.toFixed(0)} (${p.rep.count})` : "★ new";

export default function Marketplace() {
  const { account, connect, connecting, refreshBalances } = useWallet();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [cards, setCards] = useState<Record<string, ProviderCard>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<BuyResult | null>(null);
  const [feedbackTx, setFeedbackTx] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ps = await listProviders();
      setProviders(ps);
      const entries = await Promise.all(ps.map(async (p) => [p.endpoint, await getCard(p.endpoint)] as const));
      setCards(Object.fromEntries(entries.filter(([, c]) => c)) as Record<string, ProviderCard>);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const buy = async () => {
    if (!account || !selected || !prompt.trim()) return;
    setBusy(true);
    setError(null);
    setOut(null);
    setFeedbackTx(null);
    try {
      const res = await buyInference(selected, prompt.trim(), account, model.trim() || undefined);
      setOut(res);
      refreshBalances();
      const prov = providers.find((p) => p.endpoint === selected);
      if (prov?.agentId !== undefined) {
        try {
          setFeedbackTx(await giveFeedback(account, prov.agentId, 100));
          void refresh();
        } catch {
          /* feedback best-effort */
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selCard = selected ? cards[selected] : null;
  const registered = providers.filter((p) => p.agentId !== undefined).length;

  return (
    <div className="mx-auto max-w-5xl px-8 py-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Compute marketplace</h1>
          <p className="mt-1 text-sm text-white/45">
            Buy LLM inference from agents — ranked by on-chain reputation, paid in AVAX.
          </p>
        </div>
        <button onClick={() => void refresh()} className="text-[13px] text-white/45 transition hover:text-white">
          ↻ refresh
        </button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Stat label="providers online" value={providers.length} />
        <Stat label="on-chain (ERC-8004)" value={registered} tint={registered ? "#9aa8f0" : undefined} />
        <Stat label="cheapest" value={selCard ? `${selCard.priceAvax ?? "?"} AVAX` : "—"} />
      </div>

      <div className="mb-3 mt-9 text-[11px] uppercase tracking-[0.16em] text-white/30">Providers</div>
      {loading ? (
        <Card>
          <p className="text-sm text-white/40">Loading providers…</p>
        </Card>
      ) : providers.length === 0 ? (
        <Card>
          <h2 className="text-base font-semibold">No providers online</h2>
          <p className="mt-1 max-w-md text-sm text-white/45">Start the relay and a provider agent:</p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/70">
{`cd apps/agent && npm run relay
npm run drift -- --name oracle --skills llm-inference`}
          </pre>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const c = cards[p.endpoint];
            const on = selected === p.endpoint;
            return (
              <button
                key={p.endpoint}
                onClick={() => setSelected(p.endpoint)}
                className={`rounded-2xl border bg-white/[0.02] p-5 text-left transition hover:border-[#9aa8f0]/50 ${
                  on ? "border-[#9aa8f0] shadow-[0_0_0_1px_#9aa8f0]" : "border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold">{p.name}</span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                    {repText(p)}
                  </span>
                </div>
                <div className="mt-1.5 text-[12px] text-[#9aa8f0]">{c?.skill ?? p.skills[0] ?? "compute"}</div>
                <div className="mt-3 text-[12px] leading-relaxed text-white/40">
                  {c?.provider ? `${c.provider} · ${c.model}` : "model: —"}
                  <br />
                  {p.agentId !== undefined ? `ERC-8004 #${p.agentId} · ` : "unregistered · "}
                  {short(p.addr)}
                </div>
                <div className="mt-3 text-[13px]">
                  <span className="font-semibold text-[#e84142]">{c?.priceAvax ?? "?"} AVAX</span>{" "}
                  <span className="text-white/35">/ call</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3 mt-9 text-[11px] uppercase tracking-[0.16em] text-white/30">Buy inference</div>
      <Card>
        <div className="mb-3 text-[12.5px] text-white/40">
          {selCard ? (
            <>
              → <span className="text-white/70">{selCard.name}</span> · {selCard.priceAvax ?? "?"} AVAX/call
            </>
          ) : (
            "select a provider above"
          )}
        </div>
        <label className="block">
          <span className={microLabel}>Prompt</span>
          <textarea
            className={`${fieldCls} mt-1.5 min-h-[88px] resize-y`}
            placeholder="Your prompt…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className={microLabel}>Model override (optional)</span>
            <input
              className={`${fieldCls} mt-1.5`}
              placeholder="e.g. anthropic/claude-3.5-sonnet"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          {account ? (
            <button className={btnPrimary} disabled={!selected || !prompt.trim() || busy} onClick={buy}>
              {busy ? "Paying AVAX…" : "Pay & run"}
            </button>
          ) : (
            <button className={btnPrimary} onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>

        {error && <div className="mt-4 text-[13px] text-[#e84142]">⚠ {error}</div>}

        {out && (
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/30">
              Result {out.model && <span className="font-mono normal-case tracking-normal text-white/40">· {out.model}</span>}
            </div>
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/90">{out.result}</div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
              {out.txHash && (
                <a className="text-emerald-400 hover:underline" href={`${EXPLORER}/tx/${out.txHash}`} target="_blank" rel="noreferrer">
                  paid · {short(out.txHash)} ↗
                </a>
              )}
              {feedbackTx && (
                <a className="text-emerald-400 hover:underline" href={`${EXPLORER}/tx/${feedbackTx}`} target="_blank" rel="noreferrer">
                  ★ reputation posted · {short(feedbackTx)} ↗
                </a>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
