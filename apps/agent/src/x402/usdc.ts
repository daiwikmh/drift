// USDC (Circle FiatToken) on Avalanche Fuji — the x402 settlement asset. Real
// reads (balance, decimals, EIP-712 domain) and the EIP-3009 settlement call.
import { type Abi } from "viem";
import { publicClient } from "../chain/client.js";
import { ASSET } from "./types.js";

export const usdcAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "transferWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
] as const satisfies Abi;

export const USDC_DECIMALS = 6;

// USDC amount → atomic units (6 decimals), as a string.
export function toAtomic(usdc: number): string {
  return BigInt(Math.round(usdc * 10 ** USDC_DECIMALS)).toString();
}

export function fromAtomic(atomic: string | bigint): number {
  return Number(BigInt(atomic)) / 10 ** USDC_DECIMALS;
}

export async function usdcBalance(address: `0x${string}`): Promise<number> {
  const bal = (await publicClient.readContract({
    address: ASSET,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return fromAtomic(bal);
}

// The token's EIP-712 domain (name + version) is read on-chain so the signature
// matches exactly. version() is absent on some forks — default to "2" (FiatTokenV2).
let cachedDomain: { name: string; version: string } | null = null;
export async function usdcDomain(): Promise<{ name: string; version: string }> {
  if (cachedDomain) return cachedDomain;
  const name = (await publicClient.readContract({ address: ASSET, abi: usdcAbi, functionName: "name" })) as string;
  let version = "2";
  try {
    version = (await publicClient.readContract({ address: ASSET, abi: usdcAbi, functionName: "version" })) as string;
  } catch {
    /* keep default */
  }
  cachedDomain = { name, version };
  return cachedDomain;
}
