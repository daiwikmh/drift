"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { activeChain } from "../../lib/wagmi";
import { shortAddr } from "../../lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const wrongChain = isConnected && chainId !== activeChain.id;
  const metaMask =
    connectors.find((c) => c.id === "metaMaskSDK" || c.name === "MetaMask") ??
    connectors[0];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => metaMask && connect({ connector: metaMask })}
          disabled={isPending || !metaMask}
          className="rounded-md bg-ink px-3.5 py-1.5 text-[13px] font-medium text-lime transition hover:bg-ink-soft disabled:opacity-50"
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error && (
          <span className="max-w-xs text-right text-[11px] text-rose-600">
            {error.message}
          </span>
        )}
      </div>
    );
  }

  if (wrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: activeChain.id })}
        className="rounded-md bg-amber-400 px-3.5 py-1.5 text-[13px] font-medium text-ink transition hover:bg-amber-300"
      >
        Switch to {activeChain.name}
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      title="Disconnect"
      className="flex items-center gap-2 rounded-md border border-ink/15 bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-ink/5"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span className="font-mono">{shortAddr(address)}</span>
    </button>
  );
}
