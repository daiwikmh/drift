"use client";

import { usePathname } from "next/navigation";
import { useWallet } from "./WalletContext";
import { useNetwork } from "./NetworkContext";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function pageName(pathname: string) {
  if (pathname.startsWith("/dashboard/serve")) return "Go live";
  if (pathname.startsWith("/dashboard/endpoints")) return "Pay-per-call APIs";
  if (pathname.startsWith("/dashboard/identity")) return "My identity";
  if (pathname.startsWith("/dashboard/signals")) return "My signals";
  if (pathname.startsWith("/dashboard/vault")) return "Vaultometer";
  if (pathname.startsWith("/dashboard/network")) return "Live network";
  return "Marketplace";
}

export function Topbar() {
  const pathname = usePathname();
  const { account, balances, connect, connecting } = useWallet();
  const { net, cfg } = useNetwork();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0c0f]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/40">drift</span>
          <span className="text-white/20">/</span>
          <span className="font-medium text-white">{pageName(pathname)}</span>
        </div>

        <div className="flex items-center gap-2">
          {net === "mainnet" && (
            <span className="hidden items-center gap-1.5 rounded-md border border-[#e84142]/40 bg-[#e84142]/10 px-2.5 py-1 text-[11px] text-[#e84142] sm:flex">
              ⚠ real funds
            </span>
          )}
          <span className="hidden items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/40 sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${net === "mainnet" ? "bg-[#e84142]" : "bg-emerald-400"}`} />
            {cfg.short} · {cfg.chainId}
          </span>

          {account ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12.5px]">
              {balances && (
                <span className="hidden font-mono text-white/45 sm:inline">
                  {balances.avax.toFixed(3)} AVAX · {balances.usdc.toFixed(2)} USDC
                </span>
              )}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-white/80">{short(account)}</span>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="rounded-lg bg-[#9aa8f0] px-4 py-1.5 text-[12.5px] font-medium text-[#14152b] transition hover:bg-[#aeb9f4] disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
