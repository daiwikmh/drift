"use client";

import { useEffect, useState } from "react";
import {
  useConstraints,
  useRebalanceLog,
  useAgentReputation,
  useExternalRates,
} from "../../../lib/hooks";
import { activeChain } from "../../../lib/wagmi";
import { pct, countdown } from "../../../lib/format";
import { Card, Awaiting, Empty } from "../primitives";

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function ConstraintBar({
  label,
  current,
  limit,
  invert,
}: {
  label: string;
  current: number;
  limit: number;
  invert?: boolean;
}) {
  const ratio = limit > 0 ? Math.min(current / limit, 1.5) : 0;
  const ok = invert ? current >= limit : current <= limit;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-ink/55">{label}</span>
        <span
          className={`font-mono tabular-nums ${ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {pct(current)} / {pct(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
        <div
          className={`h-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function AgentPanel() {
  const now = useNow();
  const c = useConstraints();
  const log = useRebalanceLog();
  const rep = useAgentReputation();
  const rates = useExternalRates();
  const explorer = activeChain.blockExplorers?.default.url;

  if (!c.deployed) {
    return (
      <Card title="Agent brain" subtitle="RL allocation engine — live decisions">
        <Awaiting what="AgentController (NEXT_PUBLIC_AGENT_CONTROLLER)" />
      </Card>
    );
  }

  return (
    <Card title="Agent brain" subtitle="RL allocation engine — live decisions">
      <div className="space-y-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink/50">next evaluation</span>
          <span className="font-mono text-lg tabular-nums text-[#1f7a3d]">
            {c.nextEvalTs > 0 ? countdown(c.nextEvalTs, now) : "—"}
          </span>
        </div>

        <div className="space-y-3">
          <ConstraintBar
            label="Treasury floor"
            current={c.treasuryFloor.current}
            limit={c.treasuryFloor.limit}
            invert
          />
          <ConstraintBar
            label="ETH correlation cap"
            current={c.correlationCap.current}
            limit={c.correlationCap.limit}
          />
        </div>

        <div>
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/45">
            watching
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {rates.data?.ethena && (
              <Watch
                label="Ethena funding (7d)"
                value={pct(rates.data.ethena.stakingApy)}
              />
            )}
            {rates.data?.prices.map((p) => (
              <Watch
                key={p.symbol}
                label={p.symbol}
                value={p.price.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              />
            ))}
          </div>
        </div>

        {rep.deployed && (
          <div className="grid grid-cols-3 gap-3 border-t border-ink/8 pt-4 text-center">
            <Stat
              label="vs benchmark"
              value={`${rep.cumulativeYield - rep.benchmarkYield >= 0 ? "+" : ""}${pct(
                rep.cumulativeYield - rep.benchmarkYield,
              )}`}
            />
            <Stat label="Sharpe" value={rep.sharpe.toFixed(2)} />
            <Stat label="uptime" value={pct(rep.uptime)} />
          </div>
        )}

        <div className="border-t border-ink/8 pt-4">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/45">
            recent rebalances
          </span>
          {log.events.length === 0 ? (
            <Empty>No rebalances recorded yet.</Empty>
          ) : (
            <ul className="mt-2 space-y-2">
              {log.events.map((e) => (
                <li
                  key={`${e.id}-${e.txHash}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-ink/55">
                    #{e.id.toString()} ·{" "}
                    {new Date(e.timestamp * 1000).toLocaleString()}
                  </span>
                  {explorer ? (
                    <a
                      href={`${explorer}/tx/${e.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#1f7a3d] hover:underline"
                    >
                      {e.reasonHash.slice(0, 10)}…
                    </a>
                  ) : (
                    <span className="font-mono text-ink/40">
                      {e.reasonHash.slice(0, 10)}…
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function Watch({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/8 bg-sage/40 px-3 py-2">
      <div className="text-ink/45">{label}</div>
      <div className="mt-0.5 font-mono tabular-nums text-ink">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-base tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/45">
        {label}
      </div>
    </div>
  );
}
