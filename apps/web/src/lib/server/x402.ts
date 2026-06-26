// Server-side x402 helpers for Next.js API routes. Mirrors the logic in
// apps/agent/src/x402/ but runs in the Next.js Node runtime — no agent package
// imports. Settlement is delegated to a hosted facilitator (Ultravioleta DAO by
// default) so the gateway needs no funded wallet.
const USDC_FUJI = "0x5425890298aed601595a70AB815c96711a31Bc65" as const;
const NETWORK = "avalanche-fuji";
// Stable Circle USDC FiatTokenV2 EIP-712 domain on Fuji — confirmed on-chain.
const USDC_DOMAIN = { name: "USD Coin", version: "2" } as const;

export type PaymentRequirements = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: `0x${string}`;
  maxTimeoutSeconds: number;
  asset: `0x${string}`;
  extra: { name: string; version: string };
};

export type Authorization = {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
};

export type PaymentPayload = {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: { signature: `0x${string}`; authorization: Authorization };
};

export function buildRequirements(opts: {
  priceUsdc: number;
  payTo: `0x${string}`;
  resource: string;
  description: string;
}): PaymentRequirements {
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: BigInt(Math.round(opts.priceUsdc * 1e6)).toString(),
    resource: opts.resource,
    description: opts.description,
    mimeType: "application/json",
    payTo: opts.payTo,
    maxTimeoutSeconds: 120,
    asset: USDC_FUJI,
    extra: USDC_DOMAIN,
  };
}

export function decodePayment(headerB64: string): PaymentPayload | null {
  try {
    return JSON.parse(Buffer.from(headerB64, "base64").toString("utf8")) as PaymentPayload;
  } catch {
    return null;
  }
}

const FACILITATOR =
  process.env.FACILITATOR_URL ?? "https://facilitator.ultravioletadao.xyz";

function envelope(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) {
  return JSON.stringify({ x402Version: 1, paymentPayload, paymentRequirements });
}

export async function facilitatorVerify(
  payload: PaymentPayload,
  req: PaymentRequirements
): Promise<{ isValid: boolean; invalidReason: string | null }> {
  try {
    const r = await fetch(`${FACILITATOR}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: envelope(payload, req),
    });
    if (!r.ok) return { isValid: false, invalidReason: `facilitator /verify ${r.status}` };
    const j = (await r.json()) as { isValid?: boolean; invalidReason?: string | null };
    return { isValid: !!j.isValid, invalidReason: j.invalidReason ?? null };
  } catch (e) {
    return { isValid: false, invalidReason: (e as Error).message };
  }
}

export type SettleResult = {
  success: boolean;
  txHash?: `0x${string}`;
  payer?: `0x${string}`;
  error?: string;
};

export async function facilitatorSettle(
  payload: PaymentPayload,
  req: PaymentRequirements
): Promise<SettleResult> {
  try {
    const r = await fetch(`${FACILITATOR}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: envelope(payload, req),
    });
    const j = (await r.json()) as {
      success?: boolean;
      isValid?: boolean;
      transaction?: `0x${string}`;
      txHash?: `0x${string}`;
      payer?: `0x${string}`;
      errorReason?: string;
      invalidReason?: string;
      error?: string;
    };
    const txHash = j.transaction ?? j.txHash;
    const success = !!j.success || (j.isValid === true && !!txHash);
    return {
      success,
      txHash,
      payer: j.payer,
      error: success ? undefined : j.errorReason ?? j.invalidReason ?? j.error ?? "settlement failed",
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
