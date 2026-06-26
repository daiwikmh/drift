// External x402 facilitator delegation. Instead of settling payments ourselves
// (which needs a gas-funded wallet), we hand the buyer's signed EIP-3009
// authorization to a hosted facilitator that verifies it and submits the on-chain
// USDC transfer, paying gas itself. Default: Ultravioleta DAO (100% gas-covered,
// supports avalanche-fuji USDC at the same address DRIFT uses). Swap via
// FACILITATOR_URL. Nothing is mocked — settle returns the real Fuji tx hash.
import type { PaymentPayload, PaymentRequirements } from "./types.js";

export const FACILITATOR_URL =
  process.env.FACILITATOR_URL || "https://facilitator.ultravioletadao.xyz";

export type VerifyResult = { isValid: boolean; invalidReason: string | null; payer?: `0x${string}` };
export type SettleResult = {
  success: boolean;
  txHash?: `0x${string}`;
  payer?: `0x${string}`;
  network?: string;
  error?: string;
};

// Standard x402 facilitator envelope: { x402Version, paymentPayload, paymentRequirements }.
function envelope(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) {
  return JSON.stringify({ x402Version: 1, paymentPayload, paymentRequirements });
}

export async function facilitatorVerify(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResult> {
  const r = await fetch(`${FACILITATOR_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: envelope(paymentPayload, paymentRequirements),
  });
  if (!r.ok) return { isValid: false, invalidReason: `facilitator /verify ${r.status}` };
  const j = (await r.json()) as { isValid?: boolean; invalidReason?: string | null; payer?: `0x${string}` };
  return { isValid: !!j.isValid, invalidReason: j.invalidReason ?? null, payer: j.payer };
}

export async function facilitatorSettle(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResult> {
  const r = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: envelope(paymentPayload, paymentRequirements),
  });
  if (!r.ok) return { success: false, error: `facilitator /settle ${r.status}: ${(await r.text()).slice(0, 160)}` };
  // Settle response field names vary across x402 versions — accept both. When the
  // facilitator short-circuits on a failed verify it returns a verify-shaped body
  // ({ isValid, invalidReason }), so fold that in too.
  const j = (await r.json()) as {
    success?: boolean;
    isValid?: boolean;
    transaction?: `0x${string}`;
    txHash?: `0x${string}`;
    network?: string;
    payer?: `0x${string}`;
    errorReason?: string;
    invalidReason?: string;
    error?: string;
  };
  const success = j.success ?? (j.isValid === true && !!(j.transaction || j.txHash));
  return {
    success,
    txHash: j.transaction || j.txHash,
    payer: j.payer,
    network: j.network,
    error: success ? undefined : j.errorReason || j.invalidReason || j.error || "settlement failed",
  };
}
