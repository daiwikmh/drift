import type { ReactNode } from "react";
import { Sidebar } from "@/features/dashboard/components/Sidebar";
import { Topbar } from "@/features/dashboard/components/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-cream text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="dash-scroll flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1100px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
