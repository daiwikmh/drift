import type { StrategyInfo } from "../types";

export function StrategyLibrary({
  strategies,
  selectedId,
  onSelect,
}: {
  strategies: StrategyInfo[];
  selectedId: string | null;
  onSelect: (s: StrategyInfo) => void;
}) {
  return (
    <ul className="space-y-2">
      {strategies.map((s) => {
        const active = s.id === selectedId;
        return (
          <li key={s.id}>
            <button
              onClick={() => onSelect(s)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? "border-[#9aa8f0]/40 bg-white/[0.07]"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-white">{s.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-white/40">
                  {s.type}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/55">{s.blurb}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
