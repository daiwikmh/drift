"use client";

import { useCallback, useEffect, useState } from "react";
import { buyInference, EXPLORER, listProviders, type AllocationPayload, type Provider, type VaultPick } from "@/lib/market";
import { aaveUsdcPosition, depositAaveUSDC, isExecutable, MAINNET_EXPLORER } from "@/lib/deposit";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Stat, btnPrimary, btnGhost, fieldCls, microLabel } from "@/components/dashboard/ui";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const RISKS = ["conservative", "balanced", "aggressive"] as const;
const barColor = (i: number) => ["#9aa8f0", "#34d399", "#e8a341", "#e84142", "#a78bfa"][i % 5];

export default function Vaultometer() {
  const { account, connect, connecting } = useWallet();
  const [agents, setAgents] = useState<Provider[]>([]);
  const [capital, setCapital] = useState("10000");
  const [risk, setRisk] = useState<(typeof RISKS)[number]>("balanced");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<AllocationPayload | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [usedAgent, setUsedAgent] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [depBusy, setDepBusy] = useState<string | null>(null);
  const [depTx, setDepTx] = useState<Record<string, `0x${string}`>>({});
  const [depErr, setDepErr] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  const refreshPosition = useCallback(() => {
    if (account) aaveUsdcPosition(account).then(setPosition).catch(() => {});
  }, [account]);
  useEffect(() => {
    refreshPosition();
  }, [refreshPosition]);

  const deposit = async (it: VaultPick) => {
    if (!account) return;
    setDepBusy(it.pool);
    setDepErr(null);
    try {
      const tx = await depositAaveUSDC(account, it.usd);
      setDepTx((m) => ({ ...m, [it.pool]: tx }));
      refreshPosition();
    } catch (e) {
      setDepErr((e as Error).message.split("\n")[0]);
    } finally {
      setDepBusy(null);
    }
  };

  const loadAgents = useCallback(async () => {
    const all = await listProviders().catch(() => [] as Provider[]);
    setAgents(all.filter((p) => p.skills.includes("yield-allocator")));
  }, []);
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const build = useCallback(async () => {
    if (!account) return;
    const agent = agents[0]; // ranked by reputation already
    if (!agent) {
      setError("No yield-allocator agent online. Start one: drift agent --skills yield-allocator");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await buyInference(agent.endpoint, `deploy ${capital} ${risk}`, account);
      if (res.allocation) {
        setPlan(res.allocation);
        setTxHash(res.txHash);
        setUsedAgent(agent);
      } else setError("agent returned no allocation");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [account, agents, capital, risk]);

  // auto-rebalance: re-ask the agent on an interval
  useEffect(() => {
    if (!auto || !account) return;
    const t = setInterval(() => void build(), 60_000);
    return () => clearInterval(t);
  }, [auto, account, build]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Vaultometer</h1>
          <p className="mt-1 text-sm text-white/45">
            Auto-deploy capital for yield across <span className="text-white/70">existing</span> Avalanche vaults — the plan comes from a
            marketplace agent, ranked by reputation. No custom vault, no custody by us.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[12px] ${agents.length ? "border-emerald-400/30 text-emerald-400" : "border-white/10 text-white/40"}`}>
          {agents.length} yield agent{agents.length === 1 ? "" : "s"} online
        </span>
      </div>

      {/* controls */}
      <Card className="mt-7">
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className={microLabel}>Capital (USD)</span>
            <input className={`${fieldCls} mt-1.5`} value={capital} onChange={(e) => setCapital(e.target.value)} inputMode="numeric" />
          </label>
          <label className="block">
            <span className={microLabel}>Risk</span>
            <select className={`${fieldCls} mt-1.5`} value={risk} onChange={(e) => setRisk(e.target.value as typeof risk)}>
              {RISKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {account ? (
            <button className={btnPrimary} onClick={() => void build()} disabled={busy}>
              {busy ? "Asking agent…" : plan ? "Rebalance" : "Build plan"}
            </button>
          ) : (
            <button className={btnPrimary} onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
        <label className="mt-4 flex items-center gap-2 text-[12.5px] text-white/55">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Auto-rebalance every 60s (re-ask the best agent)
        </label>
        {error && <div className="mt-3 text-[13px] text-[#e84142]">⚠ {error}</div>}
      </Card>

      {plan && (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Stat label="blended APY" value={`${plan.blendedApy}%`} tint="#34d399" />
            <Stat label="projected / year" value={`$${plan.projYearUsd.toLocaleString()}`} />
            <Stat label="vaults" value={plan.items.length} />
          </div>

          {/* the meter */}
          <Card className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
              {plan.items.map((it, i) => (
                <div key={it.pool} style={{ width: `${it.allocationPct}%`, background: barColor(i) }} title={`${it.project} ${it.allocationPct}%`} />
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {plan.items.map((it, i) => (
                <div key={it.pool} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: barColor(i) }} />
                  <div className="w-44 shrink-0">
                    <div className="text-[13px] font-medium">{it.project}</div>
                    <div className="text-[11px] text-white/40">{it.symbol}{it.stable ? " · stable" : ""}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full" style={{ width: `${it.allocationPct}%`, background: barColor(i) }} />
                    </div>
                  </div>
                  <span className="w-12 text-right text-[12px] tabular-nums text-white/60">{it.allocationPct}%</span>
                  <span className="w-24 text-right text-[12px] tabular-nums text-emerald-400">{it.apy}% APY</span>
                  <span className="w-20 text-right text-[12px] tabular-nums text-white/45">${it.usd.toLocaleString()}</span>
                  <div className="w-28 text-right">
                    {depTx[it.pool] ? (
                      <a className="text-[12px] text-emerald-400 hover:underline" href={`${MAINNET_EXPLORER}/tx/${depTx[it.pool]}`} target="_blank" rel="noreferrer">
                        ✓ deposited ↗
                      </a>
                    ) : isExecutable(it) ? (
                      <button
                        onClick={() => deposit(it)}
                        disabled={depBusy !== null}
                        className="rounded-md bg-[#9aa8f0] px-2.5 py-1 text-[12px] font-medium text-[#14152b] transition hover:bg-[#aeb9f4] disabled:opacity-40"
                      >
                        {depBusy === it.pool ? "Depositing…" : `Deposit $${it.usd.toLocaleString()}`}
                      </button>
                    ) : (
                      <a className="text-[12px] text-[#9aa8f0] hover:underline" href={`https://defillama.com/yields/pool/${it.pool}`} target="_blank" rel="noreferrer">
                        deposit ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-white/10 pt-4 text-[12.5px] leading-relaxed text-white/55">{plan.rationale}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-white/40">
              {usedAgent && (
                <span>
                  plan by <span className="text-white/70">{usedAgent.name}</span>
                  {usedAgent.agentId !== undefined ? ` · #${usedAgent.agentId}` : ""}
                </span>
              )}
              {txHash && (
                <a className="text-emerald-400 hover:underline" href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
                  paid · {short(txHash)} ↗
                </a>
              )}
            </div>
          </Card>

          {depErr && <div className="mt-4 text-[13px] text-[#e84142]">⚠ {depErr}</div>}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-white/40">
            <span>
              <b className="text-white/60">Deposit</b> executes a <b className="text-[#e84142]">real Avalanche mainnet</b> tx into Aave V3 (USDC) — you sign,
              custody stays with Aave. Other vaults open via “deposit ↗”.
            </span>
            {position !== null && position > 0 && (
              <span className="text-emerald-400">your Aave USDC position: ${position.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            )}
          </div>
        </>
      )}

      {!plan && !error && (
        <div className="mt-8">
          <button className={btnGhost} onClick={loadAgents}>
            ↻ refresh agents
          </button>
        </div>
      )}
    </div>
  );
}
