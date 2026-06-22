// x402 resource-server side. The worker IS its own facilitator: it builds the 402
// requirements, verifies the client's signed authorization, and settles by sending
// the real EIP-3009 transferWithAuthorization on Avalanche Fuji (the worker pays
// gas; the payer never does). Returns the real tx hash — nothing is fabricated.
import { parseSignature, verifyTypedData } from "viem";
import { publicClient, walletFor } from "../chain/client.js";
import { typedData } from "./eip3009.js";
import { ASSET, NETWORK, type PaymentPayload, type PaymentRequirements, type SettleResponse } from "./types.js";
import { toAtomic, usdcAbi, usdcDomain } from "./usdc.js";

export async function buildRequirements(opts: {
  priceUsdc: number;
  payTo: `0x${string}`;
  resource: string;
  description: string;
  timeoutSeconds?: number;
}): Promise<PaymentRequirements> {
  const extra = await usdcDomain();
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: toAtomic(opts.priceUsdc),
    resource: opts.resource,
    description: opts.description,
    mimeType: "application/json",
    payTo: opts.payTo,
    maxTimeoutSeconds: opts.timeoutSeconds ?? 120,
    asset: ASSET,
    extra,
  };
}

export function decodePayment(headerB64: string): PaymentPayload | null {
  try {
    return JSON.parse(Buffer.from(headerB64, "base64").toString("utf8")) as PaymentPayload;
  } catch {
    return null;
  }
}

// Stateless validity check (signature + terms). Does not touch the chain except to
// read the token domain. Returns an error string when invalid, null when ok.
export async function verifyPayment(p: PaymentPayload, req: PaymentRequirements): Promise<string | null> {
  if (p.scheme !== "exact" || p.network !== req.network) return "scheme/network mismatch";
  const a = p.payload.authorization;
  if (a.to.toLowerCase() !== req.payTo.toLowerCase()) return "wrong recipient";
  if (BigInt(a.value) < BigInt(req.maxAmountRequired)) return "underpaid";
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= BigInt(a.validBefore)) return "authorization expired";
  if (now < BigInt(a.validAfter)) return "authorization not yet valid";
  const extra = await usdcDomain();
  const ok = await verifyTypedData({
    address: a.from,
    ...typedData(a, extra),
    signature: p.payload.signature,
  });
  return ok ? null : "bad signature";
}

// Settle on-chain: submit transferWithAuthorization and wait for the receipt.
export async function settlePayment(p: PaymentPayload, facilitatorKey: `0x${string}`): Promise<SettleResponse> {
  const a = p.payload.authorization;
  try {
    const { r, s, yParity } = parseSignature(p.payload.signature);
    const { account, wallet } = walletFor(facilitatorKey);
    const txHash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: ASSET,
      abi: usdcAbi,
      functionName: "transferWithAuthorization",
      args: [a.from, a.to, BigInt(a.value), BigInt(a.validAfter), BigInt(a.validBefore), a.nonce, yParity + 27, r, s],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") return { success: false, network: NETWORK, error: "tx reverted", txHash };
    return { success: true, txHash, network: NETWORK, payer: a.from };
  } catch (e) {
    return { success: false, network: NETWORK, error: (e as Error).message.split("\n")[0] };
  }
}

export function encodePaymentResponse(r: SettleResponse): string {
  return Buffer.from(JSON.stringify(r)).toString("base64");
}
