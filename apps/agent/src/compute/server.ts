// The compute a provider sells: an x402-gated LLM inference handler. It is pure
// request→response logic (no HTTP server) so it can be driven over the relay's
// WebSocket — the buyer's request is proxied to the provider, which never needs a
// public URL. An unpaid request returns 402 with the ways to pay; a paid one is
// verified/settled on Avalanche Fuji, then served by the agent's LLM.
import { privateKeyToAccount } from "viem/accounts";
import { complete, llmEnabled, llmMeta } from "../llm.js";
import { generateSignal } from "./signal.js";
import { generateAllocation } from "./yield.js";
import {
  buildRequirements,
  decodePayment,
  encodePaymentResponse,
  settlePayment,
  verifyPayment,
} from "../x402/server.js";
import { X402_VERSION } from "../x402/types.js";
import { AVAX_SCHEME, buildAvaxRequirement, verifyAvaxPayment, type AvaxPayment } from "../x402/avax.js";

export type ComputeOpts = {
  name: string;
  address: `0x${string}`;
  privateKey: `0x${string}`;
  skill: string;
  priceUsdc: number;
  priceAvax: number;
  resource: string; // canonical endpoint (the relay-proxied URL) for the 402 requirements
  onEvent?: (line: string) => void;
};

export type InferRequest = { paymentHeader?: string; body: Record<string, unknown> };
export type InferResponse = { status: number; body: unknown; paymentResponse?: string };

const SYSTEM_DEFAULT = "You are a helpful assistant. Be concise and accurate.";

export function createInferHandler(opts: ComputeOpts): (req: InferRequest) => Promise<InferResponse> {
  const log = opts.onEvent ?? (() => {});

  return async (req) => {
    const description = `${opts.skill} inference by ${opts.name}`;
    // Two ways to pay: native AVAX (client-settled) or USDC over x402 (gasless,
    // server-settled). AVAX is listed first so simple clients default to it.
    const avaxReq = buildAvaxRequirement({ priceAvax: opts.priceAvax, payTo: opts.address, resource: opts.resource, description });
    const usdcReq = await buildRequirements({ priceUsdc: opts.priceUsdc, payTo: opts.address, resource: opts.resource, description });
    const accepts = [avaxReq, usdcReq];
    const need = (error: string): InferResponse => ({ status: 402, body: { x402Version: X402_VERSION, accepts, error } });

    const header = req.paymentHeader;
    if (!header) {
      log(`402 · unpaid request for ${opts.skill}`);
      return need("payment required");
    }

    let scheme: string | undefined;
    try {
      scheme = JSON.parse(Buffer.from(header, "base64").toString("utf8")).scheme;
    } catch {
      return need("bad X-PAYMENT");
    }

    if (!llmEnabled()) return { status: 503, body: { error: "provider LLM not configured" } };

    const prompt = typeof req.body.prompt === "string" ? req.body.prompt : "";
    if (!prompt) return { status: 400, body: { error: "missing prompt" } };
    const system = typeof req.body.system === "string" ? req.body.system : SYSTEM_DEFAULT;
    const model = typeof req.body.model === "string" && req.body.model ? req.body.model : undefined;

    let txHash: `0x${string}` | undefined;
    let payer: `0x${string}` | undefined;

    if (scheme === AVAX_SCHEME) {
      const p = decodePayment(header) as unknown as AvaxPayment;
      log(`verifying AVAX payment ${p.txHash}…`);
      const v = await verifyAvaxPayment(p.txHash, avaxReq);
      if (!v.ok) {
        log(`402 · AVAX payment rejected: ${v.error}`);
        return need(v.error ?? "invalid avax payment");
      }
      txHash = p.txHash;
      payer = v.payer;
      log(`AVAX payment verified ✓ ${opts.priceAvax} AVAX`);
    } else {
      const payload = decodePayment(header);
      if (!payload) return need("bad X-PAYMENT");
      const invalid = await verifyPayment(payload, usdcReq);
      if (invalid) {
        log(`402 · rejected payment: ${invalid}`);
        return need(invalid);
      }
      log(`settling ${opts.priceUsdc} USDC on Fuji…`);
      const settled = await settlePayment(payload, opts.privateKey);
      if (!settled.success) {
        log(`settlement failed: ${settled.error}`);
        return need(settled.error ?? "settlement failed");
      }
      txHash = settled.txHash;
      payer = settled.payer;
      log(`settled ✓ ${settled.txHash}`);
    }

    const paymentResponse = encodePaymentResponse({ success: true, txHash, network: avaxReq.network, payer });

    // Flagship verifiable service: a signed, structured trade signal. The buyer
    // records it and later settles it against real price → on-chain reputation.
    if (opts.skill === "trade-signal") {
      const signal = await generateSignal(prompt);
      const account = privateKeyToAccount(opts.privateKey);
      const message = `drift-signal:${signal.symbol}:${signal.direction}:${signal.horizonHours}:${signal.entryPrice}:${signal.issuedAt}`;
      const signature = await account.signMessage({ message });
      log(`signal · ${signal.direction} ${signal.symbol} @ $${signal.entryPrice} (${signal.horizonHours}h)`);
      return {
        status: 200,
        body: { result: signal.rationale, signal: { ...signal, provider: opts.address, signature }, txHash, payer, paidWith: scheme },
        paymentResponse,
      };
    }

    // Capital-deployment plan over EXISTING Avalanche vaults (no custody here).
    if (opts.skill === "yield-allocator") {
      const allocation = await generateAllocation(prompt);
      const account = privateKeyToAccount(opts.privateKey);
      const message = `drift-yield:${allocation.capital}:${allocation.risk}:${allocation.blendedApy}:${allocation.issuedAt}`;
      const signature = await account.signMessage({ message });
      log(`yield · ${allocation.risk} · ${allocation.items.length} vaults · ${allocation.blendedApy}% blended`);
      return {
        status: 200,
        body: { result: allocation.rationale, allocation: { ...allocation, provider: opts.address, signature }, txHash, payer, paidWith: scheme },
        paymentResponse,
      };
    }

    const result = await complete(system, prompt, model);
    return {
      status: 200,
      body: { result: result ?? "", model: model ?? llmMeta()?.model ?? null, txHash, payer, paidWith: scheme },
      paymentResponse,
    };
  };
}
