import type { ReactNode } from "react";

/* ------------------------------------------------------------------ Card -- */
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.03] ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-[13px] font-semibold text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-white/40">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------- SectionHeader -- */
export function SectionHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/35 ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- StatTile -- */
export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wide text-white/40">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-lg tabular-nums ${
          accent ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-white/30">{hint}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Badge -- */
const badgeTones = {
  zinc: "border-white/15 bg-white/[0.06] text-white/60",
  lime: "border-[#9aa8f0]/30 bg-[#9aa8f0]/15 text-[#aeb9f4]",
  green: "border-emerald-400/25 bg-emerald-500/15 text-emerald-300",
  amber: "border-amber-400/25 bg-amber-400/15 text-amber-300",
  rose: "border-rose-400/25 bg-rose-500/15 text-rose-300",
} as const;

export function Badge({
  children,
  tone = "zinc",
  dot,
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badgeTones[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Button -- */
const btnVariants = {
  primary: "bg-[#9aa8f0] text-[#14152b] hover:bg-[#aeb9f4] disabled:opacity-40",
  lime: "bg-[#9aa8f0] text-[#14152b] hover:bg-[#aeb9f4] disabled:opacity-40",
  outline:
    "border border-white/15 bg-white/[0.03] text-white/85 hover:bg-white/[0.07] disabled:opacity-40",
  ghost: "text-white/55 hover:bg-white/[0.06] hover:text-white",
} as const;

export function Button({
  children,
  variant = "outline",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: keyof typeof btnVariants;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition disabled:cursor-not-allowed ${btnVariants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ Awaiting -- */
// Honest empty state — shown wherever a data source isn't configured.
export function Awaiting({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-white/20 text-white/35">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 8v4l3 2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
        Not configured
      </span>
      <span className="max-w-xs text-xs leading-relaxed text-white/40">
        Set <span className="font-mono text-white/60">{what}</span> to read live
        data here.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------ Skeleton -- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

/* ----------------------------------------------------------------- Row -- */
export function Row({
  label,
  value,
  mono = true,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-white/55">{label}</span>
      <span className={`${mono ? "font-mono tabular-nums" : ""} text-white`}>
        {value}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- Empty -- */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-1 py-8 text-center text-sm text-white/40">{children}</p>;
}
