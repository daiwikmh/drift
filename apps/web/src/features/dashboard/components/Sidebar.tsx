"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "./nav";
import { UsageWidget } from "./UsageWidget";
import { ChevronDown } from "./icons";
import { activeChain } from "@/lib/wagmi";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-ink/10 bg-white">
      {/* brand → back to landing */}
      <div className="flex h-14 items-center gap-2 border-b border-ink/8 px-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
          SPADE<sup className="top-[-0.5em] text-[10px]">&apos;</sup>
        </Link>
      </div>

      {/* project switcher */}
      <div className="border-b border-ink/8 px-3 py-3">
        <button className="flex w-full items-center justify-between rounded-md border border-ink/10 bg-sage/40 px-3 py-2 text-left hover:bg-sage/70">
          <span className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-ink text-[11px] font-bold text-lime">
              D
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-semibold text-ink">DRIP</span>
              <span className="block font-mono text-[10px] text-ink/45">
                {activeChain.name}
              </span>
            </span>
          </span>
          <ChevronDown className="text-ink/40" width={14} height={14} />
        </button>
      </div>

      {/* nav groups */}
      <nav className="dash-scroll flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.title && (
              <div className="px-2 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink/40">
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
                      className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition ${
                        active
                          ? "bg-sage font-medium text-ink"
                          : "text-ink/60 hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#1f7a3d]" />
                      )}
                      <Icon
                        className={active ? "text-ink" : "text-ink/45"}
                        width={16}
                        height={16}
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

      {/* usage + profile */}
      <div className="space-y-3 border-t border-ink/8 p-3">
        <UsageWidget />
      </div>
    </aside>
  );
}
