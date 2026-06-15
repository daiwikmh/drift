import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, AUTH_ENABLED } from "@/lib/auth";
import { Sidebar } from "@/features/dashboard/components/Sidebar";
import { Topbar } from "@/features/dashboard/components/Topbar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Gate the cockpit behind Google sign-in — but only once OAuth is configured,
  // so the app stays usable locally before AUTH_GOOGLE_ID is set.
  if (AUTH_ENABLED) {
    const session = await auth();
    if (!session) redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0c0f] text-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1100px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
