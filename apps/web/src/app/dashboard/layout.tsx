import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { WalletProvider } from "@/components/dashboard/WalletContext";
import { NetworkProvider } from "@/components/dashboard/NetworkContext";

export const metadata: Metadata = {
  title: "Marketplace — DRIFT",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      <WalletProvider>
        <div className="flex h-screen overflow-hidden bg-[#0b0c0f] text-white">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </WalletProvider>
    </NetworkProvider>
  );
}
