// Native AVAX payment scheme — "unlock inference by paying AVAX". Unlike the USDC
// x402 path (gasless, server-settled), here the client sends a real AVAX transfer
// on Avalanche Fuji and presents the tx hash; the server verifies that transfer
// on-chain (recipient, amount, confirmed, not reused) before serving. The payer
// pays gas; settlement is the client's own transaction.
import { parseEther, formatEther } from "viem";
import { publicClient, walletFor } from "../chain/client.js";
import { FUJI } from "../chain/addresses.js";

export const AVAX_SCHEME = "avax-native" as const;

export type AvaxRequirements = {
  scheme: typeof AVAX_SCHEME;
  network: string;
  chainId: number;
  maxAmountRequired: string; // wei
  payTo: `0x${string}`;
  resource: string;
  description: string;
};

export type AvaxPayment = { scheme: typeof AVAX_SCHEME; network: string; txHash: `0x${string}` };

export function toWei(avax: number): string {
  return parseEther(avax.toString()).toString();
}
export function fromWei(wei: string | bigint): number {
  return Number(formatEther(BigInt(wei)));
}

export function buildAvaxRequirement(opts: {
  priceAvax: number;
  payTo: `0x${string}`;
  resource: string;
  description: string;
}): AvaxRequirements {
  return {
    scheme: AVAX_SCHEME,
    network: FUJI.name,
    chainId: FUJI.chainId,
    maxAmountRequired: toWei(opts.priceAvax),
    payTo: opts.payTo,
    resource: opts.resource,
    description: opts.description,
  };
}

// Replay guard: a tx hash may unlock exactly one request per server lifetime.
const consumed = new Set<string>();

export async function verifyAvaxPayment(
  txHash: `0x${string}`,
  req: AvaxRequirements
): Promise<{ ok: boolean; payer?: `0x${string}`; error?: string }> {
  if (consumed.has(txHash.toLowerCase())) return { ok: false, error: "payment already used" };
  let tx;
  try {
    tx = await publicClient.getTransaction({ hash: txHash });
  } catch {
    return { ok: false, error: "tx not found on Fuji" };
  }
  if (!tx.to || tx.to.toLowerCase() !== req.payTo.toLowerCase()) return { ok: false, error: "wrong recipient" };
  if (tx.value < BigInt(req.maxAmountRequired)) return { ok: false, error: "underpaid" };
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") return { ok: false, error: "tx not confirmed" };
  consumed.add(txHash.toLowerCase());
  return { ok: true, payer: tx.from };
}

export async function payAvax(req: AvaxRequirements, privateKey: `0x${string}`): Promise<`0x${string}`> {
  const { account, wallet } = walletFor(privateKey);
  const hash = await wallet.sendTransaction({
    account,
    chain: wallet.chain,
    to: req.payTo,
    value: BigInt(req.maxAmountRequired),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
