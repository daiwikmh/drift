// Server-side x402 helpers for Next.js API routes — native CSPR scheme. The
// buyer signs and hands over a real NativeTransfer transaction; the gateway
// submits it to Casper Testnet via a raw JSON-RPC POST (no private key needed
// — the buyer already signed it) and verifies the recorded transfer effect
// (recipient + amount) before proxying the call.
//
// Talks to the node via plain `fetch` + hand-built JSON-RPC bodies instead of
// casper-js-sdk's RpcClient. That's not a style preference — RpcClient's own
// network calls were observed to fail with a nonsensical "413 Payload Too
// Large" specifically when run inside this app's Next.js route-handler
// bundle (reproducible; confirmed via direct RPC probing that neither the
// payload nor the remote node was actually at fault — the exact same calls
// succeed from a standalone Node script). Root cause not fully isolated
// (suspected webpack per-chunk duplication of the SDK module breaking an
// internal check inside RpcClient/HttpHandler); the RPC methods used here
// are simple and public, so bypassing the SDK's client sidesteps it.
import { NETWORK, RPC_URL, type CasperAccount } from "../casper";

export type PaymentRequirements = {
  scheme: "native";
  network: string;
  amount: string; // motes
  payTo: CasperAccount;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
};

export type PaymentPayload = {
  x402Version: number;
  accepted: PaymentRequirements;
  payload: { transaction: { hash?: string }; payer: CasperAccount };
};

export function buildRequirements(opts: {
  priceCspr: number;
  payTo: CasperAccount;
  resource: string;
  description: string;
}): PaymentRequirements {
  const amount = BigInt(Math.round(opts.priceCspr * 1e9)).toString();
  return {
    scheme: "native",
    network: NETWORK,
    amount,
    payTo: opts.payTo,
    maxTimeoutSeconds: 120,
    extra: {},
  };
}

export function decodePayment(headerB64: string): PaymentPayload | null {
  try {
    return JSON.parse(Buffer.from(headerB64, "base64").toString("utf8")) as PaymentPayload;
  } catch {
    return null;
  }
}

async function rpcCall<T>(method: string, params: unknown): Promise<T> {
  const r = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await r.json()) as { result?: T; error?: { code: number; message: string } };
  if (j.error) throw new Error(`Code: ${j.error.code}, err: ${j.error.message}`);
  if (j.result === undefined) throw new Error(`${method} returned no result`);
  return j.result;
}

export type VerifyResult = { isValid: boolean; invalidReason: string | null; txHash?: string };

// A native transfer is real the moment it's signed — "verify" here just
// sanity-checks the payload shape/price and reads the transaction hash the
// buyer's own client computed (so the route can check its replay guard
// before submitting). This isn't blind trust: facilitatorSettle cross-checks
// this hash against the hash the NODE itself computes upon submission, so a
// mismatched/forged hash fails settlement outright rather than bypassing the
// replay guard.
export async function facilitatorVerify(
  payload: PaymentPayload,
  req: PaymentRequirements
): Promise<VerifyResult> {
  if (payload.accepted?.scheme !== "native" || payload.accepted.network !== req.network) {
    return { isValid: false, invalidReason: "scheme/network mismatch" };
  }
  if (payload.accepted.amount !== req.amount || payload.accepted.payTo !== req.payTo) {
    return { isValid: false, invalidReason: "amount/payTo mismatch" };
  }
  const txHash = payload.payload?.transaction?.hash;
  if (!txHash || !payload.payload?.payer) {
    return { isValid: false, invalidReason: "missing signed transaction" };
  }
  return { isValid: true, invalidReason: null, txHash };
}

export type SettleResult = { success: boolean; txHash?: string; payer?: string; error?: string };

type TransferEffect = { to?: string; amount?: string };
type ExecutionResultInner = { error_message?: string | null; transfers?: Array<{ Version1?: TransferEffect; Version2?: TransferEffect }> };
type InfoGetTransactionResult = {
  execution_info?: {
    block_hash: string;
    block_height: number;
    execution_result?: { Version1?: ExecutionResultInner; Version2?: ExecutionResultInner };
  };
};

export async function facilitatorSettle(
  payload: PaymentPayload,
  req: PaymentRequirements
): Promise<SettleResult> {
  try {
    const txHash = payload.payload.transaction.hash;
    if (!txHash) return { success: false, error: "missing transaction hash" };

    const putResult = await rpcCall<{ transaction_hash: { Version1?: string; Version2?: string } }>(
      "account_put_transaction",
      { transaction: { Version1: payload.payload.transaction } }
    );
    const submittedHash = putResult.transaction_hash.Version1 ?? putResult.transaction_hash.Version2;
    if (submittedHash !== txHash) {
      return { success: false, error: "submitted transaction hash mismatch" };
    }

    const start = Date.now();
    const timeoutMs = 60_000;
    let execInner: ExecutionResultInner | undefined;
    while (Date.now() - start < timeoutMs) {
      const info = await rpcCall<InfoGetTransactionResult>("info_get_transaction", {
        transaction_hash: { Version1: txHash },
      });
      const execResult = info.execution_info?.execution_result;
      if (execResult) {
        execInner = execResult.Version1 ?? execResult.Version2;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!execInner) return { success: false, error: "timed out waiting for confirmation" };
    if (execInner.error_message) return { success: false, error: `transaction failed: ${execInner.error_message}` };

    const transfer = (execInner.transfers ?? [])
      .map((t) => t.Version1 ?? t.Version2)
      .find((t): t is TransferEffect => !!t);
    if (!transfer) return { success: false, error: "no transfer effect recorded for this transaction" };

    const to = (transfer.to ?? "").replace(/^account-hash-/, "");
    if (!to || `00${to}`.toLowerCase() !== req.payTo.toLowerCase()) {
      return { success: false, error: "transfer recipient does not match payTo" };
    }
    if (BigInt(transfer.amount ?? "0") < BigInt(req.amount)) {
      return { success: false, error: "transfer amount below required price" };
    }

    return { success: true, txHash, payer: payload.payload.payer };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
