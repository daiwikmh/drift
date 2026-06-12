import { ConnectionPanel } from "@/features/trade/components/ConnectionPanel";

export default function ConnectionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Connection</h1>
        <p className="mt-1 text-sm text-white/55">
          Connect a Bybit account to run live bots. Testnet is the default; keys
          stay in memory for this session only.
        </p>
      </div>
      <ConnectionPanel />
    </div>
  );
}
