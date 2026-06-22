// Client side of a compute purchase: POST the endpoint, get 402 + the ways to pay,
// pay (native AVAX by default, or USDC over x402), retry. Returns the real result
// and the settlement tx hash.
import { createPayment } from "../x402/client.js";
import { payAvax, AVAX_SCHEME, type AvaxRequirements } from "../x402/avax.js";
import type { PaymentRequirements } from "../x402/types.js";

export type Purchase = {
  result: string;
  model?: string | null;
  txHash?: string;
  paidWith?: string;
  signal?: {
    symbol: string;
    direction: "long" | "short" | "flat";
    horizonHours: number;
    entryPrice: number;
    confidence: number;
    rationale: string;
    issuedAt: number;
    model?: string | null;
    provider?: string;
    signature?: string;
  };
};
type Accept = (PaymentRequirements | AvaxRequirements) & { scheme: string };

export async function buyInference(
  endpoint: string,
  prompt: string,
  privateKey: `0x${string}`,
  opts: { system?: string; model?: string; pay?: "avax" | "usdc" } = {}
): Promise<Purchase> {
  const body = JSON.stringify({ prompt, system: opts.system, model: opts.model });
  const headers = { "Content-Type": "application/json" };

  const first = await fetch(endpoint, { method: "POST", headers, body });
  if (first.status !== 402) {
    if (first.ok) return (await first.json()) as Purchase;
    throw new Error(`endpoint returned ${first.status}: ${(await first.text()).slice(0, 120)}`);
  }

  const { accepts } = (await first.json()) as { accepts: Accept[] };
  const want = opts.pay === "usdc" ? "exact" : AVAX_SCHEME;
  const req = accepts?.find((a) => a.scheme === want) ?? accepts?.[0];
  if (!req) throw new Error("402 with no payment requirements");

  let paymentHeader: string;
  if (req.scheme === AVAX_SCHEME) {
    const txHash = await payAvax(req as AvaxRequirements, privateKey);
    paymentHeader = Buffer.from(JSON.stringify({ scheme: AVAX_SCHEME, network: req.network, txHash })).toString("base64");
  } else {
    const { header } = await createPayment(req as PaymentRequirements, privateKey);
    paymentHeader = header;
  }

  const paid = await fetch(endpoint, {
    method: "POST",
    headers: { ...headers, "X-PAYMENT": paymentHeader },
    body,
  });
  if (!paid.ok) throw new Error(`payment failed ${paid.status}: ${(await paid.text()).slice(0, 160)}`);
  return (await paid.json()) as Purchase;
}

export async function providerCard(endpoint: string): Promise<Record<string, unknown> | null> {
  try {
    const base = endpoint.replace(/\/infer$/, "/");
    const r = await fetch(base);
    return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
