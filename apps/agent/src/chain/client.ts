// viem clients for Avalanche Fuji. The public client reads chain state; a wallet
// client is built per-agent from its private key to send transactions.
import { createPublicClient, createWalletClient, http, type Account } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(config.rpcUrl),
});

export function walletFor(privateKey: `0x${string}`): {
  account: Account;
  wallet: ReturnType<typeof createWalletClient>;
} {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain: avalancheFuji, transport: http(config.rpcUrl) });
  return { account, wallet };
}

export const EXPLORER = "https://testnet.snowtrace.io";
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string) => `${EXPLORER}/address/${address}`;
export const nftUrl = (contract: string, tokenId: bigint) => `${EXPLORER}/nft/${contract}/${tokenId}`;
