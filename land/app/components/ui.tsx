import type { ReactNode } from "react";

export function SectionLabel({
  icon,
  children,
  tone = "dark",
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <div
      className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] ${
        tone === "dark" ? "text-ink/70" : "text-white/70"
      }`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function IconChip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm ${className}`}
    >
      {children}
    </span>
  );
}

export function ArrowLink({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <a
      href="#"
      className={`group inline-flex items-center gap-2 font-mono text-sm ${
        light ? "text-white" : "text-ink"
      }`}
    >
      <span className="text-[10px]">▶</span>
      <span className="underline-offset-4 group-hover:underline">{children}</span>
    </a>
  );
}

export function Button({
  children,
  variant = "dark",
}: {
  children: ReactNode;
  variant?: "dark" | "lime" | "outline";
}) {
  const styles = {
    dark: "bg-ink text-lime hover:bg-ink-soft",
    lime: "bg-lime-bright text-ink hover:brightness-95",
    outline: "border border-ink/20 text-ink hover:bg-ink/5",
  }[variant];
  return (
    <a
      href="#"
      className={`inline-flex items-center justify-center rounded-md px-6 py-3 font-mono text-sm transition ${styles}`}
    >
      {children}
    </a>
  );
}

/* Framed monospace data box, e.g. ▪ TRANSACTION ID … */
export function DataBox({
  label,
  lines,
  className = "",
}: {
  label: string;
  lines: string[];
  className?: string;
}) {
  return (
    <div
      className={`border border-ink/30 bg-white/40 p-3 font-mono text-[10px] leading-relaxed text-ink/80 ${className}`}
    >
      <div className="mb-1 tracking-wider">▪ {label}</div>
      {lines.map((l, i) => (
        <div key={i} className="tracking-wider">
          {l}
        </div>
      ))}
    </div>
  );
}

/* A transaction "receipt" pill — merchant logo, name, time, amount. */
export function TxnPill({
  logo,
  name,
  time,
  amount,
  className = "",
}: {
  logo: ReactNode;
  name: string;
  time: string;
  amount: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-black/5 bg-white px-5 py-3 shadow-[0_18px_40px_-18px_rgba(20,33,13,0.35)] ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
        {logo}
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-ink">{name}</div>
        <div className="font-mono text-[10px] text-ink/50">{time}</div>
      </div>
      <div className="ml-auto text-xl font-bold tracking-tight text-ink">
        {amount}
      </div>
    </div>
  );
}

/* macOS-style code window with traffic lights + cURL chrome. */
export function CodeWindow({
  children,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        dark ? "border-white/10 bg-[#0c1407]" : "border-ink/15 bg-white"
      } shadow-[0_30px_60px_-30px_rgba(20,33,13,0.5)] ${className}`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${
          dark ? "border-b border-white/10" : "border-b border-ink/10"
        }`}
      >
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
          <span className="rounded bg-zinc-200/60 px-2 py-0.5 text-ink/70">
            cURL
          </span>
        </div>
      </div>
      <div
        className={`p-4 font-mono text-[11px] leading-relaxed ${
          dark ? "text-lime/90" : "text-ink/80"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
