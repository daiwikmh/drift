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
      className={`rounded-xl border border-ink/10 bg-white ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-ink/8 px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-[13px] font-semibold text-ink">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-ink/50">{subtitle}</p>
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
      className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45 ${className}`}
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
    <div className="rounded-lg border border-ink/8 bg-sage/40 px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wide text-ink/45">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-lg tabular-nums ${
          accent ? "text-[#1f7a3d]" : "text-ink"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-ink/40">{hint}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Badge -- */
const badgeTones = {
  zinc: "border-ink/15 bg-ink/5 text-ink/60",
  lime: "border-[#1f7a3d]/25 bg-lime/25 text-[#1f7a3d]",
  green: "border-emerald-600/25 bg-emerald-500/15 text-emerald-700",
  amber: "border-amber-600/25 bg-amber-400/20 text-amber-700",
  rose: "border-rose-600/25 bg-rose-400/15 text-rose-700",
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
  primary: "bg-ink text-lime hover:bg-ink-soft disabled:opacity-40",
  lime: "bg-lime-bright text-ink hover:brightness-95 disabled:opacity-40",
  outline:
    "border border-ink/15 bg-white text-ink hover:bg-ink/5 disabled:opacity-40",
  ghost: "text-ink/55 hover:bg-ink/5 hover:text-ink",
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
// Honest empty state — shown wherever a contract/data source isn't configured.
export function Awaiting({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-ink/20 text-ink/35">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 8v4l3 2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
        Awaiting deployment
      </span>
      <span className="max-w-xs text-xs leading-relaxed text-ink/45">
        Set the <span className="font-mono text-ink/60">{what}</span> address in
        your environment to read live data here.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------ Skeleton -- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink/8 ${className}`} />;
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
      <span className="text-ink/55">{label}</span>
      <span className={`${mono ? "font-mono tabular-nums" : ""} text-ink`}>
        {value}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- Empty -- */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-1 py-8 text-center text-sm text-ink/45">{children}</p>;
}
