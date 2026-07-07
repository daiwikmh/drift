"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "./ProfileMenu";

const nav = [
  { label: "Pay-per-call APIs", href: "/dashboard", icon: "bolt" },
  { label: "Marketplace", href: "/dashboard/marketplace", icon: "grid" },
  { label: "AI", href: "/dashboard/ai", icon: "spark" },
  { label: "Composition", href: "/dashboard/composition", icon: "layers" },
  { label: "Playground", href: "/dashboard/playground", icon: "play" },
];

const paths: Record<string, string> = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  play: "M8 5v14l11-7z",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8",
  layers: "M12 3 2 8l10 5 10-5-10-5ZM2 16l10 5 10-5M2 12l10 5 10-5",
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

  useEffect(() => {
    setCollapsed(localStorage.getItem("drift.sidebar") === "1");
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
          <Image src="/logo.png" alt="DRIFT" width={28} height={28} className="h-7 w-7 object-contain" />
          {!collapsed && <span className="text-sm font-semibold tracking-tight">DRIFT</span>}
        </Link>
      </div>

      <nav className={`flex-1 space-y-0.5 pt-2 ${collapsed ? "px-2" : "px-3"}`}>
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

      <ProfileMenu collapsed={collapsed} />

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
