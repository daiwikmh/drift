"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { connectWallet, usdcAvaxBalances } from "@/lib/market";

type Ctx = {
  account: `0x${string}` | null;
  balances: { avax: number; usdc: number } | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  refreshBalances: () => void;
};

const WalletCtx = createContext<Ctx>({
  account: null,
  balances: null,
  connecting: false,
  error: null,
  connect: async () => {},
  refreshBalances: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [balances, setBalances] = useState<{ avax: number; usdc: number } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = () => {
    if (!account) return;
    usdcAvaxBalances(account)
      .then(setBalances)
      .catch(() => {});
  };

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      setAccount(await connectWallet());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(refreshBalances, [account]);

  return (
    <WalletCtx.Provider value={{ account, balances, connecting, error, connect, refreshBalances }}>
      {children}
    </WalletCtx.Provider>
  );
}

export const useWallet = () => useContext(WalletCtx);
