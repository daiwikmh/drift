"use client";

import { useCallback, useEffect, useState } from "react";
import { EXPLORER } from "@/lib/market";
import { giveFeedback } from "@/lib/chain";
import { loadSignals, saveSignals, scoreSignal, spotPrice, type SignalRecord } from "@/lib/signals";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Stat, btnPrimary } from "@/components/dashboard/ui";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const left = (sec: number) => {
  const h = Math.ceil(sec / 3600);
  return h < 48 ? `${h}h` : `${Math.ceil(h / 24)}d`;
};

export default function Signals() {
  const { account, connect, connecting } = useWallet();
  const [records, setRecords] = useState<SignalRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (account) setRecords(loadSignals(account));
  }, [account]);

  useEffect(() => {
    reload();
  }, [reload]);

  const settle = async (rec: SignalRecord) => {
    if (!account) return;
    setBusy(rec.id);
    setError(null);
    try {
      const price = await spotPrice(rec.signal.symbol);
      const score = scoreSignal(rec.signal, price);
      let feedbackTx: `0x${string}` | undefined;
      if (rec.agentId !== undefined) feedbackTx = await giveFeedback(account, rec.agentId, score.value, "trade-signal");
      const list = loadSignals(account).map((r) =>
        r.id === rec.id
          ? { ...r, settled: true, outcome: { hit: score.hit, pnlPct: score.pnlPct, exitPrice: score.exitPrice, value: score.value, feedbackTx } }
          : r
      );
      saveSignals(account, list);
      setRecords(list);
    } catch (e) {
      setError((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(null);
    }
  };

  const now = Date.now() / 1000;
  const settled = records.filter((r) => r.settled);
  const hits = settled.filter((r) => r.outcome?.hit).length;
  const accuracy = settled.length ? Math.round((hits / settled.length) * 100) : null;

  return (
    <div className="mx-auto max-w-3xl px-8 py-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">My signals</h1>
          <p className="mt-1 text-sm text-white/45">
            Trade signals you bought. Settle after the horizon — the outcome posts on-chain reputation for the provider.
          </p>
        </div>
        {account && (
          <button onClick={reload} className="text-[13px] text-white/45 transition hover:text-white">
            ↻ refresh
          </button>
        )}
      </div>

      {!account ? (
        <Card className="mt-8">
          <h2 className="text-base font-semibold">Connect a wallet</h2>
          <p className="mt-1 text-sm text-white/45">Your signals are tied to your wallet.</p>
          <button onClick={connect} disabled={connecting} className={`${btnPrimary} mt-5`}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        </Card>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Stat label="signals" value={records.length} />
            <Stat label="settled" value={settled.length} />
            <Stat label="accuracy" value={accuracy === null ? "—" : `${accuracy}%`} tint={accuracy ? "#34d399" : undefined} />
          </div>

          {error && <div className="mt-4 text-[13px] text-[#e84142]">⚠ {error}</div>}

          <div className="mb-3 mt-8 text-[11px] uppercase tracking-[0.16em] text-white/30">Positions</div>
          {records.length === 0 ? (
            <Card>
              <p className="text-sm text-white/45">
                No signals yet. Buy one from a <code className="text-white/70">trade-signal</code> provider on the Marketplace.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {[...records].reverse().map((r) => {
                const s = r.signal;
                const readyAt = s.issuedAt + s.horizonHours * 3600;
                const ready = now >= readyAt;
                return (
                  <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="rounded-md px-2 py-1 text-[12px] font-bold"
                        style={{
                          background: s.direction === "short" ? "rgba(232,65,66,0.15)" : "rgba(52,211,153,0.15)",
                          color: s.direction === "short" ? "#e84142" : "#34d399",
                        }}
                      >
                        {s.direction.toUpperCase()}
                      </span>
                      <span className="font-mono text-[14px]">{s.symbol}</span>
                      <span className="text-[12px] text-white/45">entry ${s.entryPrice}</span>
                      <span className="text-[12px] text-white/45">{s.horizonHours}h</span>
                      {r.agentId !== undefined && <span className="text-[12px] text-white/35">provider #{r.agentId}</span>}

                      <div className="ml-auto">
                        {r.settled ? (
                          <span className={`text-[13px] font-semibold ${r.outcome?.hit ? "text-emerald-400" : "text-[#e84142]"}`}>
                            {r.outcome?.hit ? "✓ hit" : "✗ miss"} {r.outcome?.pnlPct.toFixed(2)}%
                          </span>
                        ) : ready ? (
                          <button onClick={() => settle(r)} disabled={busy === r.id} className={btnPrimary}>
                            {busy === r.id ? "Settling…" : "Settle"}
                          </button>
                        ) : (
                          <span className="text-[12px] text-white/40">pending · {left(readyAt - now)} left</span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-white/45">{s.rationale}</p>
                    {r.settled && r.outcome?.feedbackTx && (
                      <a
                        className="mt-2 inline-block text-[12px] text-[#9aa8f0] hover:underline"
                        href={`${EXPLORER}/tx/${r.outcome.feedbackTx}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ★ reputation posted · {short(r.outcome.feedbackTx)} ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
