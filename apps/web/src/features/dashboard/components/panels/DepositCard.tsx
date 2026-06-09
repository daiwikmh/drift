"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256, type Address } from "viem";
import { addresses, dripVaultAbi, erc20Abi } from "@/lib/contracts";
import { Card, Awaiting } from "../primitives";

type Mode = "deposit" | "withdraw";

export function DepositCard() {
  const { address, isConnected } = useAccount();
  const vault = addresses.dripVault;
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");

  const { data: asset } = useReadContract({
    address: vault,
    abi: dripVaultAbi,
    functionName: "asset",
    query: { enabled: !!vault },
  });
  const assetAddr = asset as Address | undefined;

  const { data: symbol } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: !!assetAddr },
  });
  const { data: decimals } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!assetAddr },
  });
  const dec = (decimals as number | undefined) ?? 18;

  const { data: walletBal, refetch: refetchBal } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!assetAddr && !!address },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && vault ? [address, vault] : undefined,
    query: { enabled: !!assetAddr && !!address && !!vault },
  });
  const { data: vaultShares, refetch: refetchShares } = useReadContract({
    address: vault,
    abi: dripVaultAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!vault && !!address },
  });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isSuccess) {
      refetchBal();
      refetchAllowance();
      refetchShares();
      reset();
    }
  }, [isSuccess, refetchBal, refetchAllowance, refetchShares, reset]);

  if (!vault) {
    return (
      <Card title="Deposit / Withdraw">
        <Awaiting what="DripVault (NEXT_PUBLIC_DRIP_VAULT)" />
      </Card>
    );
  }

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseUnits(amount, dec) : null;
  } catch {
    parsed = null;
  }

  const sym = (symbol as string) ?? "token";
  const balance =
    mode === "deposit"
      ? (walletBal as bigint | undefined)
      : (vaultShares as bigint | undefined);
  const needsApproval =
    mode === "deposit" &&
    parsed != null &&
    ((allowance as bigint | undefined) ?? 0n) < parsed;
  const overBalance = parsed != null && balance != null && parsed > balance;
  const busy = isPending || confirming;

  const submit = () => {
    if (!parsed || !address) return;
    if (needsApproval) {
      writeContract({
        address: assetAddr!,
        abi: erc20Abi,
        functionName: "approve",
        args: [vault, maxUint256],
      });
    } else if (mode === "deposit") {
      writeContract({
        address: vault,
        abi: dripVaultAbi,
        functionName: "deposit",
        args: [parsed, address],
      });
      setAmount("");
    } else {
      writeContract({
        address: vault,
        abi: dripVaultAbi,
        functionName: "withdraw",
        args: [parsed, address, address],
      });
      setAmount("");
    }
  };

  return (
    <Card title="Deposit / Withdraw">
      <div className="mb-4 flex gap-1 rounded-lg bg-ink/5 p-1 text-sm">
        {(["deposit", "withdraw"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setAmount("");
            }}
            className={`flex-1 rounded-md py-1.5 capitalize transition ${
              mode === m
                ? "bg-ink text-lime"
                : "text-ink/50 hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {!isConnected ? (
        <p className="py-5 text-center text-sm text-ink/55">
          Connect your wallet to {mode}.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-ink/10 bg-sage/40 p-3">
            <div className="flex items-center justify-between text-xs text-ink/50">
              <span>
                {mode === "deposit" ? `${sym} to deposit` : "shares to withdraw"}
              </span>
              {balance != null && (
                <button
                  className="font-mono hover:text-ink"
                  onClick={() => setAmount(formatUnits(balance, dec))}
                >
                  balance:{" "}
                  {Number(formatUnits(balance, dec)).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{" "}
                  (max)
                </button>
              )}
            </div>
            <input
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 w-full bg-transparent font-mono text-2xl text-ink outline-none placeholder:text-ink/25"
            />
          </div>

          <button
            onClick={submit}
            disabled={!parsed || parsed === 0n || overBalance || busy}
            className="w-full rounded-xl bg-ink py-3 text-sm font-medium text-lime transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? confirming
                ? "Confirming…"
                : "Check wallet…"
              : overBalance
              ? "Insufficient balance"
              : needsApproval
              ? `Approve ${sym}`
              : mode === "deposit"
              ? "Deposit"
              : "Withdraw"}
          </button>
          <p className="text-center text-[11px] text-ink/40">
            You pay gas in MNT. Approve + {mode} are separate transactions.
          </p>
        </div>
      )}
    </Card>
  );
}
