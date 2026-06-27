// Headless x402 buyer — how an AGENT pays, no wallet popup, no human.
// It signs the EIP-3009 USDC authorization with a raw key and replays with an
// X-PAYMENT header. Same gateway endpoint the dashboard uses; only the signer
// differs (a held key instead of an injected browser wallet).
//
// Usage (from apps/web, so viem resolves):
//   TEST_PRIVATE_KEY=0x<agent-key> node scripts/x402-buy.mjs \
//     https://drift-trader.vercel.app/api/call/<listing-id> '{"prompt":"hello"}'
//
// The key stays in YOUR shell/env — never commit it. The wallet needs a little
// Fuji USDC (the facilitator pays the gas).
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

const RPC = "https://api.avax-test.network/ext/bc/C/rpc";
const USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";
const CHAIN_ID = 43113;

const pk = process.env.TEST_PRIVATE_KEY;
const endpoint = process.argv[2];
const reqBody = process.argv[3] ?? '{"prompt":"hello from an agent"}';
if (!pk || !endpoint) {
  console.error("usage: TEST_PRIVATE_KEY=0x… node scripts/x402-buy.mjs <gatewayUrl> [jsonBody]");
  process.exit(1);
}

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const pub = createPublicClient({ chain: avalancheFuji, transport: http(RPC) });
const headers = { "Content-Type": "application/json" };

// 1) Unpaid request → expect 402 with payment terms.
let r = await fetch(endpoint, { method: "POST", headers, body: reqBody });
if (r.status !== 402) {
  console.log(`no 402 (HTTP ${r.status}) →`, await r.text());
  process.exit(0);
}
const challenge = await r.json();
const terms = (challenge.accepts ?? []).find((a) => a.scheme === "exact");
if (!terms) {
  console.error("endpoint does not accept USDC (exact)");
  process.exit(1);
}
console.log(`402 → pay ${Number(terms.maxAmountRequired) / 1e6} USDC to ${terms.payTo}`);

// 2) Read the USDC EIP-712 domain so the signature hashes identically to settlement.
const abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
];
const name = await pub.readContract({ address: USDC, abi, functionName: "name" });
let version = "2";
try {
  version = await pub.readContract({ address: USDC, abi, functionName: "version" });
} catch {}

// 3) Build + sign the TransferWithAuthorization — programmatically, no popup.
const now = Math.floor(Date.now() / 1000);
const nonce = "0x" + [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
const authorization = {
  from: account.address,
  to: terms.payTo,
  value: terms.maxAmountRequired,
  validAfter: "0",
  validBefore: String(now + (terms.maxTimeoutSeconds ?? 120)),
  nonce,
};
const signature = await account.signTypedData({
  domain: { name, version, chainId: CHAIN_ID, verifyingContract: USDC },
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization",
  message: {
    from: authorization.from,
    to: authorization.to,
    value: BigInt(authorization.value),
    validAfter: 0n,
    validBefore: BigInt(authorization.validBefore),
    nonce,
  },
});

// 4) Replay with the X-PAYMENT header → gateway verifies, settles, serves.
const xPayment = Buffer.from(
  JSON.stringify({ x402Version: 1, scheme: "exact", network: terms.network, payload: { signature, authorization } })
).toString("base64");

r = await fetch(endpoint, { method: "POST", headers: { ...headers, "X-PAYMENT": xPayment }, body: reqBody });
console.log(`paid call → HTTP ${r.status}`);
const pr = r.headers.get("x-payment-response");
if (pr) {
  try {
    console.log("settled tx:", JSON.parse(Buffer.from(pr, "base64").toString()).txHash);
  } catch {}
}
console.log("response:", await r.text());
