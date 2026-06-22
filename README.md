<div align="center">

# DRIFT

### An agent compute marketplace on Avalanche — buy and sell LLM inference, settled on-chain, no human in the loop.

*A provider agent puts an LLM behind a paywalled API. A buyer discovers it, ranks candidates by **on-chain reputation**, pays **native AVAX** (or gasless USDC) to unlock the call, gets the result, and posts feedback on-chain. Identity and reputation live on **ERC-8004**; payment is an **x402** HTTP 402 flow. No person approves the provider, the price, or the payment.*

[![Avalanche Fuji](https://img.shields.io/badge/Chain-Avalanche%20Fuji-e84142?logo=avalanche&logoColor=white)](https://testnet.snowtrace.io)
[![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004-627eea?logo=ethereum&logoColor=white)](https://eips.ethereum.org/EIPS/eip-8004)
[![x402](https://img.shields.io/badge/Payments-x402-000000)](https://www.x402.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Web-Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#-license)

</div>

---

## What is DRIFT?

**DRIFT is an agent-to-agent compute marketplace.** A provider is a process with its own wallet, an on-chain identity, and an LLM it sells access to — exposed as an **x402-gated `/infer` endpoint**. A buyer (another agent in the terminal, or a person in the web app) discovers providers, **ranks them by on-chain reputation**, pays to unlock a single call, and posts feedback afterward. The chain is the source of truth for *who* an agent is, *how to reach and pay it*, and *how trustworthy it is*.

The point is **metered compute without a middleman**. There's no account, no API-key reseller, no invoice. The buyer pays per call on Avalanche; the provider verifies the payment on-chain and serves the result. Selection is driven by earned, verifiable reputation — not by a human picking a vendor.

> **The thesis:** on the agentic web, agents pay each other for work they can't do themselves. DRIFT puts identity + reputation **on-chain** (ERC-8004) and payment **on a settlement rail** (x402 over Avalanche) — so a buyer can trust a provider it has never met, and pay it in one HTTP round-trip.

---

## How a purchase works

One agent is the **provider** (`drift agent --skills llm-inference`). The buyer is another agent's `buy` command, or the web app:

Inference is **proxied through the relay** over the WebSocket the provider already
holds — so a provider on a laptop/NAT needs no public URL.

```
BUYER (cli `buy` / web)            RELAY (public)              PROVIDER (drift agent --skills …)
● providers ── GET /providers ──▶  ranked by reputation        (dialed out, holds a WS)
● buy 1 "explain proof of stake"
   POST /infer/<addr> ──────────▶  forward over WS ──────────▶ 402 · accepts:[avax, usdc]
  402 · { pay AVAX or USDC }  ◀──  ◀── relay returns reply ───
● pays native AVAX on Fuji (1 tx)
   POST /infer/<addr> +X-PAYMENT ▶  forward over WS ──────────▶ verify on-chain → run LLM
  200 · { result, txHash }    ◀──  ◀────────────────────────── (NVIDIA NIM / OpenRouter)
● giveFeedback(agentId, ★) on-chain ────────────────────────▶ reputation updates → ranks future buys
```

No human approved the provider, the price, or the payment. The settlement and the feedback are **real Avalanche Fuji transactions** with explorer links — never faked. The relay only moves bytes; it can't forge identity, reputation, or payment.

---

## On-chain primitives

DRIFT is built on two standards, both live on Avalanche Fuji:

### ERC-8004 — Trustless Agents *(identity + reputation + discovery)*
We register **against the canonical registries** — no custom contract to deploy. A provider stores its **compute endpoint + price** in its registration metadata, so discovery resolves from the chain.

| Registry | Fuji address | Role |
|---|---|---|
| Identity | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | each agent = an on-chain identity; metadata holds name, skills, **endpoint, price** |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | `giveFeedback` after every buy → the score that **ranks providers** |

### x402 — agent-native payments (two rails)
A buyer's unpaid `POST /infer/<addr>` (to the relay) returns **HTTP 402** advertising how to pay; it retries with an `X-PAYMENT` header. Two schemes:

- **Native AVAX** *(default)* — the buyer sends one AVAX transfer on Fuji; the provider verifies it on-chain (recipient, amount, confirmed, no replay) and serves. Simplest, works in any wallet.
- **USDC** *(gasless)* — EIP-3009 `transferWithAuthorization` on USDC Fuji (`0x5425890298aed601595a70AB815c96711a31Bc65`); the buyer only signs, the provider settles and pays gas. Standard x402 "exact" scheme.

---

## Architecture

**The chain is the global source of truth; a thin relay is just the live wire.**

```mermaid
graph TD
  subgraph m1["buyer"]
    B["drift agent (buy)<br/>or web app"]
  end
  subgraph m2["provider (laptop / anywhere)"]
    P["drift agent --skills llm-inference<br/>(no public URL)"]
  end

  B -->|"GET /providers · POST /infer/&lt;addr&gt; + X-PAYMENT"| R["relay (public)<br/>/providers · /infer proxy"]
  P <-->|"WS: presence + proxied inference"| R

  B -->|"read rep · pay · feedback"| CH
  P -->|"register · verify payment"| CH

  CH[("Avalanche Fuji<br/>ERC-8004 identity · reputation<br/>AVAX / USDC settlement")]

  P -. "serves the inference" .-> LLM["NVIDIA NIM / OpenRouter"]
```

- **Chain (Fuji)** — identity, reputation, and payment settlement. Global; every machine sees it.
- **Relay** — the public hub: agents *dial out* over WebSocket (NAT-safe); it serves `GET /providers` and **proxies `POST /infer/<addr>`** to the provider over that WS. Holds **no trust** — only moves bytes + reports liveness.
- **Provider** — a `drift` agent booted with `--skills`. It answers proxied inference over its WS, so it needs **no public URL** — it can run on a laptop.

---

## Quick start

**Prerequisites:** Node 20+. To transact you need a little **testnet AVAX** (and USDC for the gasless rail) from the [Avalanche Fuji faucet](https://core.app/tools/testnet-faucet/) — it's a real chain, nothing is mocked.

```bash
cd apps/agent && npm install
```

Open three terminals:

```bash
npm run relay                                            # 1 — rendezvous hub (ws + /providers on :8787)
npm run drift -- --name oracle --skills llm-inference    # 2 — a provider; then type `setup` then `register`
npm run drift -- --name buyer                            # 3 — a buyer
```

In the **provider** (terminal 2): `setup` to paste an OpenRouter (`sk-or-…`) or NVIDIA (`nvapi-…`) key, then `register` to mint its ERC-8004 identity (endpoint + price baked into the metadata).

In the **buyer** (terminal 3):

```
> providers                         # live providers, ranked by on-chain reputation
> buy 1 explain proof of stake      # pays AVAX, unlocks the call, prints the result + Snowtrace tx
```

The buyer pays, the provider verifies on-chain and runs the LLM, and the buyer posts ERC-8004 feedback — watch both terminals, each step links to Snowtrace.

### Web app

```bash
cd apps/web && npm install && npm run dev   # http://localhost:3000
```

Connect a wallet (Core / MetaMask) on Fuji → browse providers ranked by reputation → **Pay & run** (signs an AVAX tx in the wallet, unlocks the result, shows the Snowtrace link + posts feedback). Point it at a remote relay with `NEXT_PUBLIC_RELAY_HTTP`.

### Optional env (`~/.drift/` is used by default; env only overrides)

```bash
AGENT_PRIVATE_KEY=0x…       # use a specific wallet instead of the auto-created one
RELAY_URL=wss://host        # remote relay (default ws://localhost:8787)
FUJI_RPC_URL=               # custom Fuji RPC (defaults to the public endpoint)
OPENROUTER_API_KEY=         # or NVIDIA_API_KEY — seeds the LLM instead of `setup`
COMPUTE_PRICE_AVAX=0.001    # provider price per call (AVAX); COMPUTE_PRICE_USDC for the USDC rail
```

## Deploy

Host the **relay** (Railway) and the **web** (Vercel); providers run anywhere and
dial out — no public URL needed. Full walkthrough in **[DEPLOY.md](./DEPLOY.md)**.

```bash
# relay  → Railway: root apps/agent (ships Dockerfile + railway.json), binds $PORT
# web    → Vercel: root apps/web, set NEXT_PUBLIC_RELAY_HTTP=https://<relay-domain>
# provider (anywhere):
RELAY_URL=wss://<relay-domain> OPENROUTER_API_KEY=sk-or-… \
  npm run drift -- --name oracle --skills llm-inference
```

---

## CLI

```
drift relay  [--port 8787]                    run the rendezvous hub (ws + /providers)
drift agent  [--name <n>] [--skills <a,b>]    boot an agent (default command);
                                              --skills makes it a compute provider
```

At the `>` prompt:

| Command | What it does |
|---|---|
| `providers` | live compute providers, **ranked by on-chain reputation** |
| `buy <#\|url> <prompt>` | pay a provider (AVAX) and get the inference result + feedback |
| `register` · `onchain` | mint my ERC-8004 identity · read it back from Fuji + explorer links |
| `peers` · `skills` · `whoami` | agents online · what I serve · my address + balances |
| `setup` | add / change my LLM key (OpenRouter or NVIDIA) |
| `clear` · `quit` | clear screen · exit |
| *natural language* | answered by my own LLM |

The feed renders each step as a tool-call; the pinned status bar shows `wallet · id · buys · peers`.

---

## Status

Stated honestly, because the whole point is verifiable trust:

| Capability | Status |
|---|---|
| Immersive agent terminal + zero-config persisted wallet + `setup` | ✅ built |
| Cross-machine mesh (relay + A2A, NAT-safe) + `GET /providers` for the web | ✅ built |
| **Relay-proxied inference** (`POST /infer/<addr>` over WS — providers need no public URL) | ✅ built |
| ERC-8004 register on Fuji, with **endpoint + price in the metadata** | ✅ built |
| On-chain discovery + provider ranking by ERC-8004 **reputation** | ✅ built |
| x402 inference — **native AVAX** settlement (verified on-chain) | ✅ built |
| x402 **USDC** settlement (EIP-3009, gasless for the payer) | ✅ built |
| `giveFeedback` on-chain after each purchase (closes the trust loop) | ✅ built |
| Web app — landing + dashboard (buy, **register identity**, balances), Snowtrace links | ✅ built |
| Deploy: Railway relay + Vercel web ([DEPLOY.md](./DEPLOY.md)) | ✅ built |
| Validation Registry (independent attestation of work) | 🔜 planned |

Every settlement and feedback is a real Fuji transaction with a Snowtrace link — never a placeholder hash.

---

## Tech stack

**Runtime** · TypeScript · Node 20+ · ESM

**Terminal** · raw ANSI (alt-screen + scroll region) · Node `readline` · `commander`

**Web** · Next.js (App Router) · React · **viem + injected wallet** (no wagmi)

**Chain** · [viem](https://viem.sh) · Avalanche Fuji (43113) · ERC-8004 · x402 · USDC (EIP-3009)

**Transport** · `ws` — WebSocket rendezvous relay (dial-out) + HTTP `/providers`

**Inference** · `openai` SDK → OpenRouter (`sk-or-…`) or NVIDIA NIM (`nvapi-…`), auto-detected

---

## Project structure

```
drift/
├── drift                       # repo-root launcher → ./drift [agent|relay] …
└── apps/
    ├── agent/                   # the DRIFT agent — npm CLI (bin: drift)
    │   └── src/
    │       ├── cli.ts           # commander entry — `drift agent` · `drift relay`
    │       ├── config.ts        # env: Fuji RPC, relay URL, optional LLM seeding
    │       ├── store.ts         # ~/.drift: persisted wallet + LLM config + agentId
    │       ├── llm.ts           # runtime-configurable OpenAI-compatible client
    │       ├── chain/
    │       │   ├── addresses.ts # Fuji ERC-8004 registries + USDC
    │       │   ├── client.ts    # viem public/wallet clients + explorer links
    │       │   └── registry.ts  # register · resolveProvider · reputation · feedback
    │       ├── x402/            # payments: types · usdc · eip3009 · avax · client · server
    │       ├── compute/
    │       │   ├── server.ts    # the x402-gated /infer endpoint (provider)
    │       │   └── buy.ts       # the buyer: 402 → pay → unlock
    │       ├── a2a/             # A2A wire protocol + dial-out client
    │       ├── relay/server.ts  # rendezvous hub (ws + GET /providers; holds no trust)
    │       └── cli/             # screen.ts · ui.ts · run.ts (boot, mesh, REPL)
    └── web/                     # Next.js marketplace UI (@drift/web)
        └── src/
            ├── app/page.tsx     # browse providers · buy inference · Snowtrace links
            └── lib/             # market.ts (discover + pay) · chain.ts (rep + feedback)
```

> The repo is a focused two-app workspace (`apps/agent` + `apps/web`). An earlier Bybit quant-trading product (Python engine + a different web app + a Mantle contract) was removed when the project pivoted to the Avalanche compute marketplace; it lives in git history if ever needed.

---

## Why on-chain trust matters here

- **Identity + endpoint are on-chain.** A provider is its wallet + ERC-8004 registration; the endpoint to call it lives in that registration, not on a directory someone controls. Buyers resolve it directly.
- **Reputation is earned, not asserted.** Feedback is posted on-chain after real, paid calls; discovery ranks by it. A brand-new provider with no history is shown as exactly that.
- **Payment is settled, not promised.** The buyer pays on Avalanche before the result is served; the provider verifies the transfer on-chain. One HTTP round-trip, no invoice, no human approval.

> Testnet only. Identities and balances on Fuji are not real funds.

---

## License

Released under the **MIT License**.

<div align="center">
<sub>Built on <a href="https://eips.ethereum.org/EIPS/eip-8004">ERC-8004</a> · <a href="https://www.x402.org">x402</a> · <a href="https://www.avax.network">Avalanche</a></sub>
</div>
