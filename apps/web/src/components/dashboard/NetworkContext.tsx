"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NETWORKS, setNetModule, switchWalletNetwork, type NetConfig, type NetKey } from "@/lib/network";

type Ctx = { net: NetKey; cfg: NetConfig; setNet: (n: NetKey) => void };
const NetworkCtx = createContext<Ctx>({ net: "testnet", cfg: NETWORKS.testnet, setNet: () => {} });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [net, setNetState] = useState<NetKey>("testnet");

  useEffect(() => {
    const s = localStorage.getItem("drift.net");
    if (s === "mainnet" || s === "testnet") {
      setNetState(s);
      setNetModule(s);
    }
  }, []);

  const setNet = (n: NetKey) => {
    setNetState(n);
    setNetModule(n);
    localStorage.setItem("drift.net", n);
    void switchWalletNetwork(n);
  };

  return <NetworkCtx.Provider value={{ net, cfg: NETWORKS[net], setNet }}>{children}</NetworkCtx.Provider>;
}

export const useNetwork = () => useContext(NetworkCtx);
