import type { ComponentType, SVGProps } from "react";
import { ChartIcon, AgentIcon, GridIcon, BookIcon, GearIcon } from "./icons";

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
      { label: "Markets", href: "/dashboard", icon: ChartIcon },
      { label: "Bots", href: "/dashboard/bots", icon: AgentIcon },
      { label: "Portfolio", href: "/dashboard/portfolio", icon: GridIcon },
    ],
  },
  {
    title: "Research",
    items: [{ label: "Research", href: "/dashboard/backtest", icon: BookIcon }],
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
      if (it.href === "/dashboard" ? pathname === it.href : pathname.startsWith(it.href)) {
        return it.label;
      }
    }
  }
  return "Markets";
}
