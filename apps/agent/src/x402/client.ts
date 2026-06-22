// x402 client: turn a server's PaymentRequirements into a signed X-PAYMENT header.
// The signer never sends a transaction — it only signs an EIP-3009 authorization,
// so the payer spends no gas. Used by the CLI; the web signs the same struct via
// the browser wallet.
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { typedData } from "./eip3009.js";
import { X402_VERSION } from "./types.js";
import type { Authorization, PaymentPayload, PaymentRequirements } from "./types.js";

function randomNonce(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}`;
}

export async function createPayment(
  req: PaymentRequirements,
  privateKey: `0x${string}`
): Promise<{ header: string; payload: PaymentPayload }> {
  const account = privateKeyToAccount(privateKey);
  const now = Math.floor(Date.now() / 1000);
  const auth: Authorization = {
    from: account.address,
    to: req.payTo,
    value: req.maxAmountRequired,
    validAfter: "0",
    validBefore: String(now + req.maxTimeoutSeconds),
    nonce: randomNonce(),
  };
  const signature = await account.signTypedData(typedData(auth, req.extra));
  const payload: PaymentPayload = {
    x402Version: X402_VERSION,
    scheme: "exact",
    network: req.network,
    payload: { signature, authorization: auth },
  };
  return { header: Buffer.from(JSON.stringify(payload)).toString("base64"), payload };
}

export function decodePaymentResponse(headerB64: string): { success: boolean; txHash?: string; network?: string } {
  try {
    return JSON.parse(Buffer.from(headerB64, "base64").toString("utf8"));
  } catch {
    return { success: false };
  }
}
