// Headless x402 buyer — how an AGENT pays, no wallet popup, no human.
// It signs a real native CSPR transfer with a raw Casper key (PEM file) and
// replays with a PAYMENT-SIGNATURE header. Same gateway endpoint the
// dashboard uses; only the signer differs (a held key instead of the Casper
// Wallet browser extension). The gateway submits the signed transaction and
// verifies it on-chain — same as it does for a browser buyer.
//
// Usage (from apps/web, so deps resolve):
//   CLIENT_PRIVATE_KEY_PATH=./agent.pem CLIENT_KEY_ALGO=ed25519 \
//     node scripts/x402-buy.mjs <gatewayUrl> [jsonBody]
//
// The key stays on YOUR disk — never commit it. See scripts/gen-casper-key.mjs
// to generate one.
import { readFile } from "fs/promises";
import casperSdk from "casper-js-sdk";

const { PrivateKey, KeyAlgorithm, NativeTransferBuilder, AccountHash } = casperSdk;

const pemPath = process.env.CLIENT_PRIVATE_KEY_PATH;
const algo = process.env.CLIENT_KEY_ALGO === "secp256k1" ? KeyAlgorithm.SECP256K1 : KeyAlgorithm.ED25519;
const endpoint = process.argv[2];
const reqBody = process.argv[3] ?? '{"prompt":"hello from an agent"}';
if (!pemPath || !endpoint) {
  console.error("usage: CLIENT_PRIVATE_KEY_PATH=./agent.pem node scripts/x402-buy.mjs <gatewayUrl> [jsonBody]");
  process.exit(1);
}

const pemContent = await readFile(pemPath, "utf-8");
const privateKey = PrivateKey.fromPem(pemContent, algo);
const accountHash = "00" + privateKey.publicKey.accountHash().toHex();
const headers = { "Content-Type": "application/json" };

// 1) Unpaid request → expect 402 with payment terms (base64 in PAYMENT-REQUIRED).
let r = await fetch(endpoint, { method: "POST", headers, body: reqBody });
if (r.status !== 402) {
  console.log(`no 402 (HTTP ${r.status}) →`, await r.text());
  process.exit(0);
}
const requiredHeader = r.headers.get("PAYMENT-REQUIRED");
if (!requiredHeader) {
  console.error("402 response missing PAYMENT-REQUIRED header");
  process.exit(1);
}
const paymentRequired = JSON.parse(Buffer.from(requiredHeader, "base64").toString());
const requirements = (paymentRequired.accepts ?? []).find((a) => a.scheme === "native");
if (!requirements) {
  console.error("endpoint does not accept native CSPR");
  process.exit(1);
}
console.log(`402 → pay ${Number(requirements.amount) / 1e9} CSPR to ${requirements.payTo}`);

// 2) Build + sign a plain native transfer — programmatically, no popup.
const chainName = requirements.network.split(":").slice(1).join(":");
const transaction = new NativeTransferBuilder()
  .from(privateKey.publicKey)
  .targetAccountHash(AccountHash.fromString(requirements.payTo))
  .amount(requirements.amount)
  .id(Date.now())
  .chainName(chainName)
  .payment(100_000_000)
  .build();
transaction.sign(privateKey);

// 3) Replay with the PAYMENT-SIGNATURE header → gateway submits + verifies + serves.
const paymentPayload = {
  x402Version: paymentRequired.x402Version,
  accepted: requirements,
  payload: { transaction: transaction.toJSON(), payer: accountHash },
};
const header = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

r = await fetch(endpoint, { method: "POST", headers: { ...headers, "PAYMENT-SIGNATURE": header }, body: reqBody });
console.log(`paid call → HTTP ${r.status}`);
const pr = r.headers.get("PAYMENT-RESPONSE");
if (pr) {
  try {
    console.log("settled tx:", JSON.parse(Buffer.from(pr, "base64").toString()).transaction);
  } catch {}
}
console.log("response:", await r.text());
