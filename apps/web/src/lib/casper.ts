// Casper network config for the pay-per-call gateway. Payment is a plain
// native CSPR transfer — the buyer signs it with Casper Wallet and submits
// it (via the gateway) to the network; the gateway verifies the recorded
// transfer effect before proxying the call. No CEP-18 token, no facilitator
// signing key needed.
//
// No casper-js-sdk import here on purpose: this file is imported by both
// server code and client ("use client") pages, and a static top-level import
// of casper-js-sdk breaks Next's server-side prerender of those client pages
// (its dual node/browser build resolves to an empty module under webpack's
// SSR bundling of "use client" components). Modules that need the SDK load it
// via a dynamic import() at call time instead — see x402casper.ts/casperBalance.ts.

export const NETWORK = "casper:casper-test" as const; // CAIP-2 id
export const CHAIN_NAME = "casper-test";
export const RPC_URL = "https://node.testnet.casper.network/rpc";
export const EXPLORER = "https://testnet.cspr.live";

export const CSPR_DECIMALS = 9;
// Standard Casper native-transfer payment amount (motes) — fixed protocol fee.
export const TRANSFER_GAS_MOTES = 100_000_000;
// Casper Testnet chainspec: native_transfer_minimum_motes = 2_500_000_000.
// Any native transfer below this is rejected by the node — not our rule, the
// chain's. Listings must be priced at or above this.
export const MIN_TRANSFER_CSPR = 2.5;

// Casper account address: "00" (account-hash) or "01" (hash) + 64 hex chars.
export type CasperAccount = string;

export function isCasperAccount(value: string): value is CasperAccount {
  return /^(00|01)[0-9a-fA-F]{64}$/.test(value);
}

// Dynamically imports casper-js-sdk (see the note above) and returns its
// namespace regardless of whether the loaded build exposes everything on
// `.default` (the Node/CJS build) or as top-level named exports (the browser
// build) — the two builds don't wrap their exports the same way. Memoized:
// every call site MUST get the same module instance (not just the same
// package) — under webpack's per-chunk bundling, separate dynamic import()
// call sites can otherwise resolve to distinct copies of the module, so a
// `Transaction` built via one copy fails `instanceof`-style checks inside an
// `HttpHandler`/`RpcClient` built via another (observed as a nonsensical
// "413 Payload Too Large" from deep inside the SDK).
let sdkPromise: Promise<typeof import("casper-js-sdk")> | null = null;
export function loadCasperSdk(): Promise<typeof import("casper-js-sdk")> {
  if (!sdkPromise) {
    sdkPromise = import("casper-js-sdk").then((mod) => (mod.default ?? mod) as unknown as typeof import("casper-js-sdk"));
  }
  return sdkPromise;
}

// Derive the "00"-prefixed account-hash address from a full public-key hex,
// matching @make-software/casper-x402's signer.ts accountAddress() convention.
export async function accountHashFromPublicKey(publicKeyHex: string): Promise<CasperAccount> {
  const { PublicKey } = await loadCasperSdk();
  const publicKey = PublicKey.fromHex(publicKeyHex);
  return "00" + publicKey.accountHash().toHex();
}
