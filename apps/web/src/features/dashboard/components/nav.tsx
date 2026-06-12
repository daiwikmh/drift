import type { ComponentType, SVGProps } from "react";
import { ChartIcon, AgentIcon, GearIcon } from "./icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type NavGroup = { title?: string; items: NavItem[] };

// Sidebar navigation — each item is a real route under /dashboard.
export const navGroups: NavGroup[] = [
  {
    title: "Trade",
    items: [
      { label: "Backtest", href: "/dashboard", icon: ChartIcon },
      { label: "Live bots", href: "/dashboard/live", icon: AgentIcon },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Connection", href: "/dashboard/connection", icon: GearIcon }],
  },
];

// Title the current page from the pathname (used by the topbar breadcrumb).
export function titleFor(pathname: string): string {
  for (const g of navGroups) {
    for (const it of g.items) {
      if (it.href === pathname) return it.label;
    }
  }
  return "Backtest";
}
