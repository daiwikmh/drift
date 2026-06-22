// Global network selection (Avalanche Fuji testnet ↔ Avalanche mainnet). A module
// mirror keeps non-React libs (market/deposit) in sync with the React context so
// `connectWallet` etc. target the active chain. NOTE: features are network-bound —
// compute (relay/providers/x402) runs on testnet; real vault deposits are mainnet —
// so each action still enforces the chain it needs; the toggle sets the ambient
// chain, the indicator, and the "real funds" warning.
export type NetKey = "testnet" | "mainnet";

export type NetConfig = {
  key: NetKey;
  label: string;
  short: string;
  chainId: number;
  chainHex: string;
  rpc: string;
  explorer: string;
  addParams: {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls: string[];
  };
};

export const NETWORKS: Record<NetKey, NetConfig> = {
  testnet: {
    key: "testnet",
    label: "Testnet",
    short: "Fuji",
    chainId: 43113,
    chainHex: "0xa869",
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    explorer: "https://testnet.snowtrace.io",
    addParams: {
      chainId: "0xa869",
      chainName: "Avalanche Fuji",
      nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
      rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
      blockExplorerUrls: ["https://testnet.snowtrace.io"],
    },
  },
  mainnet: {
    key: "mainnet",
    label: "Mainnet",
    short: "Avalanche",
    chainId: 43114,
    chainHex: "0xa86a",
    rpc: "https://api.avax.network/ext/bc/C/rpc",
    explorer: "https://snowtrace.io",
    addParams: {
      chainId: "0xa86a",
      chainName: "Avalanche C-Chain",
      nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
      rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
      blockExplorerUrls: ["https://snowtrace.io"],
    },
  },
};

// Module mirror of the active network (kept in sync by NetworkContext).
let _net: NetKey = "testnet";
export function getNet(): NetKey {
  return _net;
}
export function setNetModule(n: NetKey): void {
  _net = n;
}
export function activeNet(): NetConfig {
  return NETWORKS[_net];
}

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
export async function switchWalletNetwork(n: NetKey): Promise<void> {
  const eth = (globalThis as { ethereum?: Eth }).ethereum;
  if (!eth) return;
  const cfg = NETWORKS[n];
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902) {
      await eth.request({ method: "wallet_addEthereumChain", params: [cfg.addParams] });
    }
  }
}
