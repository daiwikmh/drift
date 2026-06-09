"use client";

import { useState } from "react";
import { addresses, subgraphUrl } from "../../lib/contracts";
import { activeChain } from "../../lib/wagmi";

// Mirrors the "Starter plan usage" widget in the reference dashboards, but shows
// something honest for DRIP: which on-chain sources are wired up on this build.
const sources = [
  { key: "Vault", on: !!addresses.dripVault },
  { key: "Agent", on: !!addresses.agentController },
  { key: "Streak", on: !!addresses.streakManager },
  { key: "Reputation", on: !!addresses.reputationRegistry },
  { key: "Subgraph", on: !!subgraphUrl },
];

export function UsageWidget() {
  const [open, setOpen] = useState(true);
  const configured = sources.filter((s) => s.on).length;

  return (
    <div className="rounded-lg border border-ink/10 bg-sage/50 p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between font-mono text-[11px] font-medium uppercase tracking-wide text-ink/55"
      >
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1f7a3d] pulse-dot" />
          Deployment status
        </span>
        <span className="text-ink/35">{open ? "–" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {sources.map((s) => (
            <div key={s.key} className="flex items-center justify-between text-[11px]">
              <span className="text-ink/50">{s.key}</span>
              <span
                className={`flex items-center gap-1.5 font-mono ${
                  s.on ? "text-[#1f7a3d]" : "text-ink/35"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.on ? "bg-[#1f7a3d]" : "bg-ink/20"
                  }`}
                />
                {s.on ? "live" : "—"}
              </span>
            </div>
          ))}
          <div className="mt-2 border-t border-ink/10 pt-2 font-mono text-[10px] text-ink/40">
            {configured}/{sources.length} sources · {activeChain.name}
          </div>
        </div>
      )}
    </div>
  );
}
