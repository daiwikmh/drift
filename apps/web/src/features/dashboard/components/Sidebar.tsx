"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-white/10 bg-[#0a0b0e]">
      {/* brand → back to landing */}
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          DRIFT
        </Link>
        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-amber-300">
          testnet
        </span>
      </div>

      {/* nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.title && (
              <div className="px-2 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-white/30">
                {group.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition ${
                        active
                          ? "bg-white/[0.07] text-white"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                      }`}
                    >
                      <Icon
                        className={active ? "text-[#9aa8f0]" : "text-white/45"}
                        width={18}
                        height={18}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <p className="px-1 font-mono text-[10px] leading-relaxed text-white/30">
          Point-in-time backtests · no look-ahead. Live orders on Bybit testnet.
        </p>
      </div>
    </aside>
  );
}
