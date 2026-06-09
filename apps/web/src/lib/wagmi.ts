import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { metaMask, injected } from "wagmi/connectors";

// Chain selection is env-driven so the same build targets mainnet or testnet.
// NEXT_PUBLIC_CHAIN = "mantle" | "mantleSepolia" (defaults to testnet for safety).
const useMainnet = process.env.NEXT_PUBLIC_CHAIN === "mantle";
export const activeChain = useMainnet ? mantle : mantleSepoliaTestnet;

// Official Mantle RPC by default (free); override with NEXT_PUBLIC_RPC_URL.
const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (useMainnet ? "https://rpc.mantle.xyz" : "https://rpc.sepolia.mantle.xyz");

export const wagmiConfig = createConfig({
  // Both chains are registered (active one first, so it's the default target);
  // transports are provided for each.
  chains: useMainnet ? [mantle, mantleSepoliaTestnet] : [mantleSepoliaTestnet, mantle],
  connectors: [
    // metaMask uses the MetaMask SDK under the hood (desktop + mobile deeplink).
    metaMask({
      dappMetadata: {
        name: "DRIP",
        url: typeof window !== "undefined" ? window.location.origin : "https://drip.app",
      },
    }),
    injected(),
  ],
  // SSR-safe: wagmi hydrates from cookies, no hydration mismatch.
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [activeChain.id]: http(rpcUrl),
    [mantle.id]: http(useMainnet ? rpcUrl : "https://rpc.mantle.xyz"),
    [mantleSepoliaTestnet.id]: http(useMainnet ? "https://rpc.sepolia.mantle.xyz" : rpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
