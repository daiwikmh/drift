"use client";

import { useState } from "react";
import { addresses, subgraphUrl } from "@/lib/contracts";
import { activeChain } from "@/lib/wagmi";
import { Card, Row, Badge } from "@/features/dashboard/components/primitives";
import { WalletButton } from "@/features/dashboard/components/WalletButton";
import { CopyIcon } from "@/features/dashboard/components/icons";

const contractList: { label: string; env: string; value?: string }[] = [
  { label: "DripVault", env: "NEXT_PUBLIC_DRIP_VAULT", value: addresses.dripVault },
  { label: "DripPool", env: "NEXT_PUBLIC_DRIP_POOL", value: addresses.dripPool },
  { label: "AgentController", env: "NEXT_PUBLIC_AGENT_CONTROLLER", value: addresses.agentController },
  { label: "StreakManager", env: "NEXT_PUBLIC_STREAK_MANAGER", value: addresses.streakManager },
  { label: "ReputationRegistry", env: "NEXT_PUBLIC_REPUTATION_REGISTRY", value: addresses.reputationRegistry },
  { label: "AssetRegistry", env: "NEXT_PUBLIC_ASSET_REGISTRY", value: addresses.assetRegistry },
  { label: "Agent (EOA)", env: "NEXT_PUBLIC_AGENT_ADDRESS", value: addresses.agent },
];

function AddressRow({ label, env, value }: { label: string; env: string; value?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="flex items-center justify-between border-b border-ink/8 py-2.5 last:border-0">
      <div>
        <div className="text-sm text-ink">{label}</div>
        <div className="font-mono text-[10px] text-ink/40">{env}</div>
      </div>
      {value ? (
        <button
          onClick={copy}
          className="flex items-center gap-2 rounded-md border border-ink/10 bg-sage/40 px-2.5 py-1 font-mono text-xs text-ink/70 hover:bg-sage"
        >
          {value.slice(0, 6)}…{value.slice(-4)}
          <CopyIcon width={13} height={13} className={copied ? "text-[#1f7a3d]" : "text-ink/40"} />
        </button>
      ) : (
        <Badge>not set</Badge>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink/55">
          Network, wallet, and the on-chain address registry this build reads
          against.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Network">
          <Row label="Chain" value={activeChain.name} mono={false} />
          <Row label="Chain ID" value={activeChain.id} />
          <Row
            label="Explorer"
            value={
              activeChain.blockExplorers?.default.url ? (
                <a
                  href={activeChain.blockExplorers.default.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1f7a3d] hover:underline"
                >
                  {activeChain.blockExplorers.default.url.replace("https://", "")}
                </a>
              ) : (
                "—"
              )
            }
            mono={false}
          />
          <Row
            label="Subgraph"
            value={subgraphUrl ? <Badge tone="lime" dot>connected</Badge> : <Badge>not set</Badge>}
            mono={false}
          />
        </Card>

        <Card title="Wallet">
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink/55">
              Connect MetaMask to read your position and sign deposits.
            </p>
            <WalletButton />
          </div>
        </Card>
      </div>

      <Card
        title="Contract registry"
        subtitle="Every address is env-driven; unset sources show an awaiting state in the UI."
      >
        <div className="-my-1">
          {contractList.map((c) => (
            <AddressRow key={c.env} {...c} />
          ))}
        </div>
      </Card>
    </div>
  );
}
