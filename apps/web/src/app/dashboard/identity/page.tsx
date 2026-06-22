"use client";

import { useEffect, useState } from "react";
import { EXPLORER } from "@/lib/market";
import { ERC8004, isRegistered, registerIdentity } from "@/lib/chain";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Stat, btnPrimary, fieldCls, microLabel } from "@/components/dashboard/ui";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function Identity() {
  const { account, balances, connect, connecting, refreshBalances } = useWallet();
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [name, setName] = useState("my-agent");
  const [busy, setBusy] = useState(false);
  const [minted, setMinted] = useState<{ agentId: number; txHash: `0x${string}` } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      setRegistered(null);
      return;
    }
    isRegistered(account)
      .then(setRegistered)
      .catch(() => setRegistered(null));
  }, [account, minted]);

  const register = async () => {
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      setMinted(await registerIdentity(account, { name: name.trim() || "my-agent" }));
      refreshBalances();
    } catch (e) {
      setError((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-9">
      <h1 className="font-display text-2xl tracking-tight">My identity</h1>
      <p className="mt-1 text-sm text-white/45">
        Your wallet is your agent. Mint an ERC-8004 identity on Avalanche Fuji — it earns reputation as you transact.
      </p>

      {!account ? (
        <Card className="mt-8">
          <h2 className="text-base font-semibold">Connect a wallet</h2>
          <p className="mt-1 text-sm text-white/45">Connect Core or MetaMask on Avalanche Fuji to view or mint your identity.</p>
          <button onClick={connect} disabled={connecting} className={`${btnPrimary} mt-5`}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        </Card>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Stat label="AVAX" value={balances ? balances.avax.toFixed(3) : "…"} />
            <Stat label="USDC" value={balances ? balances.usdc.toFixed(2) : "…"} />
            <Stat
              label="ERC-8004"
              value={registered === null ? "…" : registered ? "registered" : "not yet"}
              tint={registered ? "#34d399" : registered === false ? "#fbbf24" : undefined}
            />
          </div>

          <Card className="mt-8">
            <div className="flex items-center justify-between">
              <span className={microLabel}>Wallet</span>
              <a
                className="text-[12px] text-[#9aa8f0] hover:underline"
                href={`${EXPLORER}/address/${account}`}
                target="_blank"
                rel="noreferrer"
              >
                {short(account)} ↗
              </a>
            </div>

            {registered ? (
              <p className="mt-4 text-sm text-white/55">
                This wallet already holds an ERC-8004 identity. It accrues reputation from feedback after every paid call.
              </p>
            ) : (
              <div className="mt-4">
                <label className="block">
                  <span className={microLabel}>Agent name</span>
                  <input className={`${fieldCls} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <button onClick={register} disabled={busy} className={`${btnPrimary} mt-4`}>
                  {busy ? "Minting on Fuji…" : "Register on-chain"}
                </button>
                <p className="mt-3 text-[12px] text-white/35">
                  Needs a little testnet AVAX for gas —{" "}
                  <a className="text-[#9aa8f0] hover:underline" href="https://core.app/tools/testnet-faucet/" target="_blank" rel="noreferrer">
                    faucet ↗
                  </a>
                </p>
              </div>
            )}

            {error && <div className="mt-4 text-[13px] text-[#e84142]">⚠ {error}</div>}

            {minted && (
              <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.05] p-4">
                <div className="text-sm text-emerald-300">✓ Registered · agent #{minted.agentId}</div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                  <a className="text-[#9aa8f0] hover:underline" href={`${EXPLORER}/tx/${minted.txHash}`} target="_blank" rel="noreferrer">
                    tx {short(minted.txHash)} ↗
                  </a>
                  <a
                    className="text-[#9aa8f0] hover:underline"
                    href={`${EXPLORER}/nft/${ERC8004.identity}/${minted.agentId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    identity NFT ↗
                  </a>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
