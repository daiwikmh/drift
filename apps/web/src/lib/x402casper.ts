// Browser pay flow — native CSPR. The buyer builds a plain NativeTransfer
// transaction, signs it with the Casper Wallet extension's transaction-signing
// interface (not typed-data — this is a real transfer, not a meta-tx), and
// hands the signed transaction to the gateway, which submits + verifies it on
// Casper Testnet before proxying the call. No CEP-18 token, no gasless
// authorization — the buyer pays the network's standard transfer fee.
import { NETWORK, CHAIN_NAME, TRANSFER_GAS_MOTES, accountHashFromPublicKey, loadCasperSdk, type CasperAccount } from "./casper";

type SignatureResponse = { cancelled: true } | { cancelled: false; signatureHex: string; signature: Uint8Array };

interface CasperWalletProviderInstance {
  requestConnection(): Promise<boolean>;
  getActivePublicKey(): Promise<string>;
  sign(transactionJson: string, signingPublicKeyHex: string): Promise<SignatureResponse>;
}

declare global {
  interface Window {
    CasperWalletProvider?: (options?: { timeout?: number }) => CasperWalletProviderInstance;
  }
}

function getProvider(): CasperWalletProviderInstance {
  const factory = globalThis.window?.CasperWalletProvider;
  if (!factory) throw new Error("No wallet found — install the Casper Wallet extension");
  return factory();
}

export async function connectWallet(): Promise<CasperAccount> {
  const provider = getProvider();
  const ok = await provider.requestConnection();
  if (!ok) throw new Error("Casper Wallet connection was rejected");
  const publicKeyHex = await provider.getActivePublicKey();
  return await accountHashFromPublicKey(publicKeyHex);
}

type PaymentRequirements = {
  scheme: string;
  network: string;
  amount: string; // motes
  payTo: CasperAccount;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
};

type PaymentRequired = {
  x402Version: number;
  error?: string;
  resource?: { url: string };
  accepts: PaymentRequirements[];
};

export type PaidResponse = {
  status: number;
  json: unknown;
  txHash?: string;
  priceCspr?: number;
};

function decodeHeaderJson<T>(headerB64: string): T {
  return JSON.parse(atob(headerB64)) as T;
}

// Pay (if challenged) and replay. Returns the upstream response plus the
// settlement transaction hash decoded from PAYMENT-RESPONSE.
export async function payAndCall(endpoint: string, body: unknown, account: CasperAccount): Promise<PaidResponse> {
  const payload = JSON.stringify(body ?? {});
  const headers = { "Content-Type": "application/json" };

  const first = await fetch(endpoint, { method: "POST", headers, body: payload });
  if (first.status !== 402) {
    const j = await first.json().catch(() => ({}));
    if (first.ok) return { status: first.status, json: j };
    throw new Error((j as { error?: string }).error || `endpoint returned ${first.status}`);
  }

  const requiredHeader = first.headers.get("PAYMENT-REQUIRED");
  if (!requiredHeader) throw new Error("402 response missing PAYMENT-REQUIRED header");
  const paymentRequired = decodeHeaderJson<PaymentRequired>(requiredHeader);
  const req = paymentRequired.accepts.find((a) => a.scheme === "native" && a.network === NETWORK);
  if (!req) throw new Error("endpoint does not accept native CSPR on Casper Testnet");

  const provider = getProvider();
  const publicKeyHex = await provider.getActivePublicKey();
  const signerAccount = await accountHashFromPublicKey(publicKeyHex);
  if (signerAccount.toLowerCase() !== account.toLowerCase()) {
    throw new Error("connected Casper Wallet account changed — reconnect and try again");
  }

  const { PublicKey, AccountHash, NativeTransferBuilder } = await loadCasperSdk();
  const payerPublicKey = PublicKey.fromHex(publicKeyHex);
  const targetAccountHash = AccountHash.fromString(req.payTo);

  const transaction = new NativeTransferBuilder()
    .from(payerPublicKey)
    .targetAccountHash(targetAccountHash)
    .amount(req.amount)
    .id(Date.now())
    .chainName(CHAIN_NAME)
    .payment(TRANSFER_GAS_MOTES)
    .build();

  const signed = await provider.sign(JSON.stringify(transaction.toJSON()), publicKeyHex);
  if (signed.cancelled) throw new Error("signing was cancelled");
  transaction.setSignature(signed.signature, payerPublicKey);

  const x402Payload = {
    x402Version: paymentRequired.x402Version,
    accepted: req,
    payload: { transaction: transaction.toJSON(), payer: signerAccount },
  };
  const header = btoa(JSON.stringify(x402Payload));

  const paid = await fetch(endpoint, {
    method: "POST",
    headers: { ...headers, "PAYMENT-SIGNATURE": header },
    body: payload,
  });
  const json = await paid.json().catch(() => ({}));
  if (!paid.ok) throw new Error((json as { error?: string }).error || `unlock failed ${paid.status}`);

  let txHash: string | undefined;
  const pr = paid.headers.get("PAYMENT-RESPONSE");
  if (pr) {
    try {
      txHash = decodeHeaderJson<{ transaction?: string }>(pr).transaction;
    } catch {
      /* ignore */
    }
  }
  return { status: paid.status, json, txHash, priceCspr: Number(req.amount) / 10 ** 9 };
}
