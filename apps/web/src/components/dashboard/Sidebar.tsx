"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RELAY_HTTP } from "@/lib/market";

const nav = [
  { label: "Marketplace", href: "/dashboard", icon: "grid" },
  { label: "Become a provider", href: "/dashboard/serve", icon: "plug" },
];

const paths: Record<string, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  plug: "M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0zM12 16v6",
};

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[20px] w-[20px] shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem("drift.sidebar") === "1");
  }, []);

  useEffect(() => {
    let alive = true;
    const ping = () =>
      fetch(`${RELAY_HTTP}/providers`)
        .then((r) => alive && setOnline(r.ok))
        .catch(() => alive && setOnline(false));
    ping();
    const t = setInterval(ping, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("drift.sidebar", next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r border-white/10 bg-[#0a0b0e] transition-[width] duration-200 ${collapsed ? "w-16" : "w-60"}`}
    >
      <div className={`flex items-center py-4 ${collapsed ? "justify-center px-0" : "px-5"}`}>
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#9aa8f0] text-[13px] font-black text-[#14152b]">
            D
          </span>
          {!collapsed && <span className="text-sm font-semibold tracking-tight">DRIFT</span>}
        </Link>
      </div>

      <div className={`pb-3 pt-2 ${collapsed ? "flex justify-center px-2" : "px-5"}`}>
        {collapsed ? (
          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-red-500"}`} title="relay" />
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-white/30">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : online === false ? "bg-red-500" : "bg-white/30"}`} />
            {online ? "relay online" : online === false ? "relay offline" : "connecting…"}
          </div>
        )}
      </div>

      <nav className={`flex-1 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg py-2 text-[13.5px] transition ${collapsed ? "justify-center px-0" : "px-3"} ${
                active ? "bg-white/[0.07] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
              }`}
            >
              <Icon name={item.icon} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-white/10 py-4 ${collapsed ? "px-2 text-center" : "px-5"}`}>
        <a
          href="https://testnet.snowtrace.io"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-[12px] text-white/35 transition hover:text-white/70"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#e84142]" />
          {!collapsed && "Avalanche Fuji"}
        </a>
      </div>

      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand" : "Collapse"}
        className="absolute -right-3 top-16 grid h-6 w-6 place-items-center rounded-full border border-white/15 bg-[#14151a] text-white/50 transition hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </aside>
  );
}
