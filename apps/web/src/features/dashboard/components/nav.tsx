import type { ComponentType, SVGProps } from "react";
import { GridIcon, VaultIcon, AgentIcon, TrophyIcon, GearIcon } from "./icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type NavGroup = { title?: string; items: NavItem[] };

// Sidebar navigation — each item is a real route under /dashboard.
export const navGroups: NavGroup[] = [
  {
    items: [{ label: "Overview", href: "/dashboard", icon: GridIcon }],
  },
  {
    title: "Protocol",
    items: [
      { label: "Vault", href: "/dashboard/vault", icon: VaultIcon },
      { label: "Agent", href: "/dashboard/agent", icon: AgentIcon },
      { label: "Leaderboard", href: "/dashboard/leaderboard", icon: TrophyIcon },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Settings", href: "/dashboard/settings", icon: GearIcon }],
  },
];

// Title the current page from the pathname (used by the topbar breadcrumb).
export function titleFor(pathname: string): string {
  for (const g of navGroups) {
    for (const it of g.items) {
      if (it.href === pathname) return it.label;
    }
  }
  return "Overview";
}
