"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletContext";
import { useNetwork } from "./NetworkContext";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Deterministic gradient avatar from the address — no extra dependency.
function avatarStyle(addr: string): React.CSSProperties {
  const h = parseInt(addr.slice(2, 8), 16) % 360;
  return { background: `linear-gradient(135deg, hsl(${h} 70% 60%), hsl(${(h + 60) % 360} 70% 50%))` };
}

export function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const { account, balances, connect, connecting, disconnect } = useWallet();
  const { cfg } = useNetwork();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!account) {
    return (
      <div className={`border-t border-white/10 py-3 ${collapsed ? "px-2" : "px-3"}`}>
        <button
          onClick={connect}
          disabled={connecting}
          title="Connect wallet"
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-[#9aa8f0] py-2 text-[12.5px] font-medium text-[#14152b] transition hover:bg-[#aeb9f4] disabled:opacity-50 ${collapsed ? "px-0" : "px-3"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
            <path d="M3 7h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3zM17 11h4M3 7V5a2 2 0 0 1 2-2h9" />
          </svg>
          {!collapsed && (connecting ? "Connecting…" : "Connect wallet")}
        </button>
      </div>
    );
  }

  const copy = () => {
    navigator.clipboard.writeText(account).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div ref={ref} className={`relative border-t border-white/10 py-3 ${collapsed ? "px-2" : "px-3"}`}>
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#14151a] shadow-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-white/35">Wallet</div>
            <div className="mt-1 font-mono text-[12px] text-white/80">{short(account)}</div>
            {balances && (
              <div className="mt-2 font-mono text-[12px] text-white/45">
                {balances.avax.toFixed(3)} AVAX · {balances.usdc.toFixed(2)} USDC
              </div>
            )}
          </div>
          <button onClick={copy} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12.5px] text-white/70 transition hover:bg-white/[0.05]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            {copied ? "Copied!" : "Copy address"}
          </button>
          <a
            href={`${cfg.explorer}/address/${account}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12.5px] text-white/70 transition hover:bg-white/[0.05]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <path d="M14 4h6v6M20 4l-8 8M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
            </svg>
            View on {cfg.short === "Fuji" ? "Snowtrace" : "Explorer"}
          </a>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12.5px] text-[#e84142] transition hover:bg-[#e84142]/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Disconnect
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        title={short(account)}
        className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-left transition hover:bg-white/[0.05] ${collapsed ? "justify-center px-0" : "px-2"}`}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-black/70" style={avatarStyle(account)}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0b0e]" />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-[12px] text-white/80">{short(account)}</span>
            <span className="block truncate text-[10.5px] text-white/35">
              {balances ? `${balances.usdc.toFixed(2)} USDC` : "connected"}
            </span>
          </span>
        )}
        {!collapsed && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-white/30">
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>
    </div>
  );
}
