import { createPublicClient, http } from "viem";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

// Same env contract as the web app's wagmi config: NEXT_PUBLIC_CHAIN selects
// the chain, NEXT_PUBLIC_RPC_URL overrides the default RPC.
export const useMainnet = process.env.NEXT_PUBLIC_CHAIN === "mantle";
export const activeChain = useMainnet ? mantle : mantleSepoliaTestnet;

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (useMainnet ? "https://rpc.mantle.xyz" : "https://rpc.sepolia.mantle.xyz");

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(rpcUrl),
});
