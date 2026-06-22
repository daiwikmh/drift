import type { ReactNode } from "react";

export const fieldCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none transition focus:border-[#9aa8f0]/50 disabled:opacity-50";
export const btnPrimary =
  "rounded-lg bg-[#9aa8f0] px-4 py-2 text-[13px] font-medium text-[#14152b] transition hover:bg-[#aeb9f4] disabled:opacity-40";
export const btnGhost =
  "rounded-lg border border-white/15 px-4 py-2 text-[13px] text-white/70 transition hover:bg-white/[0.06]";
export const microLabel = "text-[11px] uppercase tracking-[0.12em] text-white/35";

export function Card({
  title,
  sub,
  children,
  className = "",
}: {
  title?: string;
  sub?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.02] p-5 ${className}`}>
      {title && <h2 className="text-sm font-medium text-white/80">{title}</h2>}
      {sub && <p className="mt-1 text-[12.5px] leading-relaxed text-white/40">{sub}</p>}
      {children}
    </div>
  );
}

export function Stat({ label, value, tint }: { label: string; value: ReactNode; tint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className={microLabel}>{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={tint ? { color: tint } : undefined}>
        {value}
      </div>
    </div>
  );
}

export function Section({ label }: { label: string }) {
  return <div className="mb-3 mt-8 text-[11px] uppercase tracking-[0.16em] text-white/30">{label}</div>;
}

export function Dot({ color, className = "h-2 w-2" }: { color: string; className?: string }) {
  return <span className={`shrink-0 rounded-full ${className}`} style={{ background: color }} />;
}
