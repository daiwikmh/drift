"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { connectWallet } from "@/lib/x402casper";
import { csprBalance } from "@/lib/casperBalance";
import type { CasperAccount } from "@/lib/casper";

type Ctx = {
  account: CasperAccount | null;
  balances: { cspr: number } | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => void;
};

const WalletCtx = createContext<Ctx>({
  account: null,
  balances: null,
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  refreshBalances: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<CasperAccount | null>(null);
  const [balances, setBalances] = useState<{ cspr: number } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = () => {
    if (!account) return;
    csprBalance(account)
      .then((cspr) => setBalances({ cspr }))
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

  const disconnect = () => {
    setAccount(null);
    setBalances(null);
    setError(null);
  };

  useEffect(refreshBalances, [account]);

  return (
    <WalletCtx.Provider value={{ account, balances, connecting, error, connect, disconnect, refreshBalances }}>
      {children}
    </WalletCtx.Provider>
  );
}

export const useWallet = () => useContext(WalletCtx);
