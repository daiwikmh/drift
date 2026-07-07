"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, btnPrimary, fieldCls, microLabel } from "@/components/dashboard/ui";
import { listListings, callListing, type Listing } from "@/lib/listings";

type Turn = { prompt: string; answer: string; txHash?: string; error?: string };

// Best-effort extraction of a plain-text answer from an arbitrary listing's
// JSON response, since AI listings aren't required to share one exact shape.
// Falls back to the raw JSON so nothing is ever silently dropped.
function extractAnswer(json: unknown): string {
  if (typeof json === "string") return json;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const key of ["result", "response", "answer", "message", "content", "text", "output"]) {
      if (typeof o[key] === "string") return o[key] as string;
    }
  }
  return JSON.stringify(json, null, 2);
}

export default function AiUsage() {
  const { account, connect, connecting } = useWallet();
  const [providers, setProviders] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  const refresh = useCallback(() => {
    listListings()
      .then((all) => setProviders(all.filter((l) => l.category === "ai")))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!selectedId && providers.length) setSelectedId(providers[0].id);
  }, [providers, selectedId]);

  const selected = providers.find((p) => p.id === selectedId) ?? null;

  const send = async () => {
    if (!account || !selected || !prompt.trim()) return;
    const thisPrompt = prompt.trim();
    setPrompt("");
    setBusy(true);
    try {
      const r = await callListing(selected.id, { prompt: thisPrompt }, account);
      setTurns((t) => [...t, { prompt: thisPrompt, answer: extractAnswer(r.json), txHash: r.txHash }]);
    } catch (e) {
      setTurns((t) => [...t, { prompt: thisPrompt, answer: "", error: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-9">
      <h1 className="font-display text-2xl tracking-tight">AI</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/45">
        Pay per prompt in native CSPR — no subscription, no API key of your own. Each message is one signed transfer
        to the provider you pick below. Providers are regular{" "}
        <Link href="/dashboard" className="text-[#9aa8f0] hover:underline">
          listings
        </Link>{" "}
        tagged <span className="font-mono text-white/60">AI</span>.
      </p>

      <Card className="mt-7">
        {loading ? (
          <p className="text-sm text-white/40">Loading providers…</p>
        ) : providers.length === 0 ? (
          <p className="text-sm text-white/40">
            No AI providers listed yet.{" "}
            <Link href="/dashboard" className="text-[#9aa8f0] hover:underline">
              List one
            </Link>{" "}
            (pick category “AI” when listing) to see it here.
          </p>
        ) : (
          <>
            <span className={microLabel}>Provider</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`rounded-full border px-3 py-1.5 text-left text-[12.5px] transition ${
                    selectedId === p.id
                      ? "border-[#9aa8f0] bg-[#9aa8f0]/10 text-white"
                      : "border-white/10 text-white/55 hover:border-white/30"
                  }`}
                >
                  {p.name}
                  <span className="text-white/35"> · {p.priceCspr.toFixed(2)} CSPR/msg</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      {selected && (
        <Card className="mt-4">
          {turns.length > 0 && (
            <div className="mb-4 max-h-[420px] space-y-4 overflow-y-auto">
              {turns.map((t, i) => (
                <div key={i} className="space-y-2">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#9aa8f0]/15 px-3.5 py-2 text-[13px] text-white">
                    {t.prompt}
                  </div>
                  {t.error ? (
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#e84142]/30 bg-[#e84142]/10 px-3.5 py-2 text-[13px] text-[#e84142]">
                      ⚠ {t.error}
                    </div>
                  ) : (
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] text-white/85">
                      {t.answer}
                      {t.txHash && (
                        <div className="mt-1.5 text-[11px] text-emerald-400/80">settled · {t.txHash.slice(0, 10)}…</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {account ? (
            <div className="flex items-end gap-2">
              <textarea
                className={`${fieldCls} h-16 flex-1 resize-none`}
                placeholder={`Ask ${selected.name}…`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button onClick={send} disabled={busy || !prompt.trim()} className={btnPrimary}>
                {busy ? "Paying…" : `Pay ${selected.priceCspr.toFixed(2)} & ask`}
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={connecting} className={btnPrimary}>
              {connecting ? "Connecting…" : "Connect wallet to chat"}
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
