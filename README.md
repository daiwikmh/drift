<div align="center">

<img src="apps/web/public/logo.png" alt="DRIFT logo" width="120" />

# DRIFT

### A pay-per-call gateway for HTTP APIs and MCP servers, settled on Casper.

*List any HTTP API or MCP server at a price. A buyer — human or agent — pays **per call in native CSPR** with one signed transfer: no keys, no invoice, no subscription. The gateway submits and verifies the payment on **Casper Testnet** and replays the call to your endpoint, which stays private.*

[![Live demo](https://img.shields.io/badge/▶%20Live%20demo-drift--trader.vercel.app-9aa8f0)](https://drift-trader.vercel.app)
[![Casper Testnet](https://img.shields.io/badge/Chain-Casper%20Testnet-FF473E)](https://testnet.cspr.live)
[![x402](https://img.shields.io/badge/Payments-x402-000000)](https://www.x402.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Web-Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

**▶ Live app:** **[drift-trader.vercel.app](https://drift-trader.vercel.app)** — list any API/MCP server, pay per call in native CSPR on Casper Testnet.

</div>

---

## What is DRIFT?

**DRIFT is a pay-per-call gateway.** An owner lists an existing HTTP API or MCP server at one price — no code, just a URL. A buyer (a person in the web app, or any x402 client) pays per call by signing a plain native CSPR transfer; the gateway submits it, verifies the recorded transfer on-chain, and proxies the call to the owner's upstream. **The upstream URL and any auth key are never exposed** — buyers only ever hit the gateway.

The point is **metered access without a middleman account**. There's no API-key reseller, no invoice, no subscription — the buyer pays on Casper before the call runs, the gateway confirms the payment on-chain, and the request goes straight through.

> **The protocol:** this follows the [`casper-x402`](https://github.com/make-software/casper-x402) reference's `casper:*` CAIP-2 network family and x402 HTTP flow (402 → sign → replay → settle), using a **native CSPR transfer** as the payment primitive instead of the reference's CEP-18 `transfer_with_authorization` scheme — simpler, needs no wrapped token and no facilitator signing key, at the cost of the buyer paying their own small network fee instead of a fully gasless signature.

---

## How a purchase works

```
BUYER (web, Casper Wallet)          DRIFT GATEWAY (/api/call/<id>)          OWNER UPSTREAM (private)
● POST /api/call/<id> ────────────▶ 402 · PAYMENT-REQUIRED: [native CSPR]
  402 · pay 0.01 CSPR         ◀─────
● sign a NativeTransfer transaction via Casper Wallet (one signature, own network fee)
  POST + PAYMENT-SIGNATURE ───────▶ submit + confirm + verify recorded transfer
                                     ├─ HTTP → replay body verbatim ───────────▶ your API
                                     └─ MCP  → initialize → tools/call ────────▶ your MCP server
  200 · { result } + PAYMENT-RESPONSE: transaction ◀───────────────────────────
```

No human approves the price or the payment beyond the buyer's one signature. The settlement is a **real Casper Testnet transaction** with an explorer link — never a placeholder hash.

- **HTTP** listings are proxied verbatim — the buyer's JSON body is forwarded to the upstream.
- **MCP** listings are spoken properly: the gateway runs the **Streamable HTTP** handshake (`initialize` → `notifications/initialized` → `tools/call`) on the buyer's behalf, parsing both JSON and SSE responses. The buyer just sends `{ "tool", "arguments" }` — or `{ "method": "tools/list" }` to discover.
- **Private auth** — owners can attach a secret header (e.g. `Authorization: Bearer …`) that the gateway injects on every call, so a key-gated upstream stays gated. The secret never reaches buyers; the marketplace only shows a `keyed` tag.
- **Durable** — listings persist in **Upstash Redis** when configured (`UPSTASH_REDIS_REST_*`), with an in-memory fallback for local dev.

List it in the web app: **dashboard → Pay-per-call APIs → List your API** → pick **HTTP API** or **MCP server**, tag a **category**, paste the URL, set a CSPR price. Your wallet receives the revenue.

---

## AI — pay-per-prompt, no subscription

Any listing tagged category **AI** shows up in the **AI** tab as a chat: pick a provider, type a prompt, and each message is one signed native-CSPR transfer straight to that provider — no account, no monthly plan, no API key of your own. It's the same gateway and the same x402 flow as every other listing; `dashboard/ai` just renders it as a conversation instead of a raw-JSON console and best-effort extracts a plain-text answer from whatever shape the provider returns (`result`/`response`/`message`/`content`/`text`/`output`, falling back to raw JSON).

## Composition — chain listings into a pipeline

**Composition** lets you save a sequence of two or more existing listings and run them as one pipeline: each step's JSON response can be substituted into the next step's request body with `{{previous}}` (the whole response) or `{{previous.someKey}}` (one field), e.g. `{"prompt": "{{previous.result}}"}`. Running a composition pays for **every step separately, in order** — there's no escrow and no shared "pipeline wallet"; each step is a completely ordinary pay-per-call purchase against its own listing, so a step's provider is paid exactly the same way as if you'd called them directly. A pipeline stops at the first failed step. Saved compositions and their run count live in the same registry as listings (`lib/server/registry.ts`'s `Pipeline` type, `/api/pipelines`).

---

## On-chain primitives

### Native CSPR — the payment asset
Payments are plain native CSPR transfers — no CEP-18 token, no wrapping step. A buyer just needs testnet CSPR from the faucet to pay.

### x402 "native" scheme — sign, submit, verify
A buyer's unpaid `POST /api/call/<id>` returns **HTTP 402** with a `PAYMENT-REQUIRED` header describing the price and payee (an account-hash address). The buyer builds a `NativeTransferBuilder` transaction (`casper-js-sdk`), signs it with the **Casper Wallet** browser extension's transaction-signing interface, and replays with a `PAYMENT-SIGNATURE` header carrying the signed transaction. The gateway **submits the transaction itself** via a hand-built JSON-RPC POST to the public Casper Testnet RPC — no private key needed, the buyer already signed it — waits for confirmation, reads the **recorded transfer effect** straight off `info_get_transaction`'s execution result, and checks the recipient and amount match before proxying. A used transaction hash can't be replayed. (Talks to the node directly rather than through `casper-js-sdk`'s own RPC client, which was found to misbehave specifically inside a Next.js route-handler bundle — see the code comments in `lib/server/x402casper.ts`.)

There's no reference browser-wallet client for x402 on Casper upstream (`casper-x402`'s own client is built for a raw-digest PEM signer, meant for headless use). `lib/x402casper.ts` builds and signs the native transfer directly against the Casper Wallet extension's own transaction-signing API.

---

## Quick start

**Prerequisites:** Node 20+, the [Casper Wallet browser extension](https://www.casperwallet.io/), and a little **testnet CSPR** from the [Casper Testnet faucet](https://testnet.cspr.live/tools/faucet) for both the lister and the buyer accounts — it's a real chain, nothing is mocked.

```bash
cd apps/web && npm install
cp .env.example .env.local   # only Upstash is optional; no signing key needed
npm run dev                  # http://localhost:3000
```

1. **Dashboard → Pay-per-call APIs** — connect Casper Wallet, list an HTTP API or MCP server at a CSPR price (tag it **AI** to have it show up in the AI tab).
2. **Dashboard → Marketplace** — browse every listing from every owner.
3. **Dashboard → AI** — pay-per-prompt chat against any AI-tagged listing.
4. **Dashboard → Composition** — chain 2+ listings into a pipeline and run it (pays each step in order).
5. **Dashboard → Playground** — pick any listed endpoint, edit the request body, pay, and see the settlement + response.

A headless agent can buy the same way, no browser: `node scripts/x402-buy.mjs <gatewayUrl> [jsonBody]` (raw PEM key via `CLIENT_PRIVATE_KEY_PATH` — generate one with `node scripts/gen-casper-key.mjs`, then fund it from the faucet).

---

## Deploy

**Live now:** **Vercel** → [drift-trader.vercel.app](https://drift-trader.vercel.app). The whole product is `apps/web` — no separate relay or facilitator service to run, and no server-side signing key to provision.

```bash
# Vercel: root apps/web
# envs: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (durable listings — optional)
```

---

## Status

Stated honestly, because the whole point is a verifiable, real settlement:

| Capability | Status |
|---|---|
| **Pay-per-call gateway** — list any HTTP API or MCP server at a CSPR price; buyers pay per call with a signed native transfer, the gateway replays upstream with the URL + auth key kept private | ✅ built |
| **MCP-native proxying** — gateway runs the MCP Streamable-HTTP handshake (`initialize` → `tools/call`) per paid call; durable listing registry (Upstash Redis, in-memory fallback) | ✅ built |
| **Submit + verify, no facilitator key** — gateway submits the buyer's already-signed transaction via public RPC and checks the recorded transfer effect; no server-side signing key at all | ✅ built |
| **Casper Wallet browser integration** — connect, sign a real transaction, no raw-key handling in the browser | ✅ built |
| **Headless buyer script** — a PEM-keyed agent can pay with no wallet popup (`scripts/x402-buy.mjs`) | ✅ built |
| **AI tab** — pay-per-prompt chat UI against any AI-tagged listing, same x402 flow underneath | ✅ built |
| **Composition** — chain 2+ listings into a saved pipeline; each step is paid + verified independently, previous step's response feeds the next via `{{previous}}` templating | ✅ built |
| Web app — landing + dashboard (list, browse, AI, composition, playground), CSPR.live explorer links | ✅ built |
| Mainnet support | 🔜 config-only change, not yet wired to a UI toggle |
| Agent-facing discovery feed (machine-readable listing feed for autonomous buyers) | 🔜 planned |

Every settlement is a real Casper Testnet transaction with an explorer link — never a placeholder hash.

---

## Tech stack

**Web** · Next.js (App Router) · React · **casper-js-sdk + Casper Wallet extension** (no wagmi/viem)

**Payments** · x402 protocol · plain native CSPR transfers (`NativeTransferBuilder`), no CEP-18 token

**Chain** · Casper Testnet (`casper:casper-test`)

**Storage** · Upstash Redis (listing registry), in-memory fallback

---

## Project structure

```
drift/
└── apps/
    └── web/                          # Next.js app (@drift/web) — the whole product
        ├── scripts/
        │   ├── gen-casper-key.mjs    # generate a throwaway testnet keypair
        │   └── x402-buy.mjs         # headless PEM-key buyer (no wallet popup)
        └── src/
            ├── app/
            │   ├── page.tsx              # landing
            │   ├── dashboard/            # list · marketplace · ai · composition · playground
            │   └── api/                  # x402 gateway: /listings · /call/<id> · /pipelines
            └── lib/
                ├── casper.ts              # network config (RPC, explorer, CAIP-2 id)
                ├── casperBalance.ts       # real on-chain CSPR balance
                ├── listings.ts            # pay-per-call registry client
                ├── pipelines.ts           # composition client (template fill + sequential run)
                ├── x402casper.ts          # browser pay flow (build + sign native transfer)
                └── server/
                    ├── registry.ts        # listing + pipeline CRUD (Upstash-backed)
                    ├── mcp.ts             # Streamable-HTTP MCP client
                    └── x402casper.ts      # submit + verify the recorded transfer
```

> An earlier build of this project was an agent-to-agent compute marketplace on Avalanche (ERC-8004 identity/reputation, an agent-mesh CLI + relay), then briefly a CEP-18/WCSPR gasless scheme on Casper. Both were replaced by this simpler native-CSPR gateway; the old code lives in git history if ever needed.

---

## Why on-chain settlement matters here

- **Payment is settled, not promised.** The buyer signs before the call runs; the gateway submits and confirms the transfer on Casper before proxying. One HTTP round-trip, no invoice.
- **The upstream stays private.** Buyers never see the real URL or auth key — only the gateway endpoint and the x402 terms.
- **Nothing to trust server-side.** The gateway holds no signing key — it can't move funds on anyone's behalf, only read the public chain and submit what the buyer already signed.

> Testnet only. Balances on Casper Testnet are not real funds.

---

## License

Released under the **MIT License**.

<div align="center">
<sub>Built on <a href="https://github.com/make-software/casper-x402">casper-x402</a> · <a href="https://www.x402.org">x402</a> · <a href="https://casper.network">Casper</a></sub>
</div>
