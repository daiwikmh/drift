"use client";

import { useAllocation } from "../../../lib/hooks";
import { pct } from "../../../lib/format";
import { Card, Awaiting, Skeleton, Empty } from "../primitives";

const BARS = ["bg-[#1f7a3d]", "bg-lime-bright", "bg-emerald-400", "bg-teal-500", "bg-[#0b6b3a]"];

export function AllocationCard() {
  const { deployed, loading, items } = useAllocation();

  return (
    <Card title="Allocation" subtitle="Live vault weights, set by the agent">
      {!deployed ? (
        <Awaiting what="AgentController (NEXT_PUBLIC_AGENT_CONTROLLER)" />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : items.length === 0 ? (
        <Empty>No allocation reported yet.</Empty>
      ) : (
        <div className="space-y-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink/5">
            {items.map((it, i) => (
              <div
                key={it.address}
                className={BARS[i % BARS.length]}
                style={{ width: `${Math.max(it.weight * 100, 0)}%` }}
                title={`${it.symbol} ${pct(it.weight)}`}
              />
            ))}
          </div>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li
                key={it.address}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-ink/70">
                  <span className={`h-2.5 w-2.5 rounded-full ${BARS[i % BARS.length]}`} />
                  {it.symbol}
                </span>
                <span className="font-mono tabular-nums text-ink/60">
                  {pct(it.weight)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
