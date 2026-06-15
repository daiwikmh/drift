"use client";

import { useState } from "react";
import { AutoResearch } from "./AutoResearch";
import { Cockpit } from "./Cockpit";

export function Research() {
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        {(["auto", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
              mode === m ? "bg-[#9aa8f0] text-[#14152b]" : "text-white/55 hover:text-white"
            }`}
          >
            {m === "auto" ? "Auto-Research" : "Manual"}
          </button>
        ))}
      </div>
      {mode === "auto" ? <AutoResearch /> : <Cockpit />}
    </div>
  );
}
