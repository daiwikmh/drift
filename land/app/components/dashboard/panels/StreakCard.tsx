"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useStreak } from "../../../lib/hooks";
import { countdown } from "../../../lib/format";
import { Card, Awaiting, Badge } from "../primitives";

export function StreakCard() {
  const { isConnected } = useAccount();
  const s = useStreak();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card title="Streak">
      {!s.deployed ? (
        <Awaiting what="StreakManager (NEXT_PUBLIC_STREAK_MANAGER)" />
      ) : !isConnected ? (
        <p className="py-5 text-sm text-ink/55">Connect to see your streak.</p>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-4xl font-semibold text-amber-600">
                {s.days}
              </span>
              <span className="text-sm text-ink/45">
                day{s.days === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-ink/50">
              <span className="font-mono">×{s.multiplier.toFixed(2)} multiplier</span>
              {s.shieldAvailable && <Badge tone="lime">🛡 shield ready</Badge>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wide text-ink/40">
              weekly reset
            </div>
            <div className="mt-1 font-mono text-sm tabular-nums text-ink/70">
              {s.weeklyResetTs > 0 ? countdown(s.weeklyResetTs, now) : "—"}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
