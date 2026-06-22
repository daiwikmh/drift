# Deploying DRIFT

Two things to host: the **web app** (Vercel) and the **relay** (Railway). That's it.
Providers come from users clicking **Go live** in the browser — no install. The relay
is the only always-on backend, and it holds no keys, funds, or trust.

```
            ┌──────────────────────────────┐
 anyone ───▶│  web app (Vercel)            │  buy · sell (Go live) · vault · identity
            │  NEXT_PUBLIC_RELAY_HTTP ──────┐
            └──────────────────────────────┘│
                                             ▼
                              ┌────────────────────────────┐
                              │  relay (Railway)           │  wss + https
                              │  /providers · /infer proxy  │
                              └────────────────────────────┘
                                             ▲ ws (dial-out)
                              browser "Go live" providers · optional CLI agents
```

Networks (the toggle in the sidebar): **compute** runs on **Avalanche Fuji testnet**
(relay + providers + x402 + ERC-8004); the **Vaultometer's real deposits** hit
**Avalanche mainnet** (existing Aave V3 vault). Each action enforces its own chain.

---

## 1. Relay → Railway

The relay is `apps/agent` run as `drift relay`. It serves WebSocket **and** HTTP on
one port and reads `$PORT` (Railway injects it). Ships a `Dockerfile` + `railway.json`.

1. New Railway project → **Deploy from repo**.
2. Service **root directory**: `apps/agent`.
3. Deploy (Docker build → `node dist/cli.js relay`), then **Settings → Networking →
   Generate Domain** → e.g. `drift-relay-production.up.railway.app`.

That domain serves both `https://…/providers` and `wss://…` (same port, TLS by Railway).
No env vars required.

> Self-host instead: `docker build -t drift-relay apps/agent && docker run -p 8787:8787 drift-relay`

## 2. Web → Vercel

1. New Vercel project from the repo, **root directory** `apps/web` (Next.js auto-detected).
2. Env var:
   - `NEXT_PUBLIC_RELAY_HTTP = https://<your-relay>.up.railway.app`
3. Deploy. The site is the full app — discover, buy, **Go live** to sell, Vaultometer,
   identity, and the Testnet/Mainnet toggle.

That's the whole user-facing deployment. Users only need a wallet (Core/MetaMask):
- a little **Fuji AVAX** ([faucet](https://core.app/tools/testnet-faucet/)) to buy/sell compute,
- real **USDC on Avalanche mainnet** only if they use the Vaultometer's on-chain deposit.

## 3. Providers (no deployment needed)

A provider is created in the browser: dashboard → **Go live** → pick a service
(**trade-signal** / **yield-allocator** = keyless, or **llm-inference** = paste an
OpenRouter `sk-or-…` key) → **Go live**. The tab serves while open and appears on
**Live network** for everyone.

### Optional: seed always-on providers (operator)

To keep providers online 24/7 (or offer USDC settlement), run CLI agents anywhere —
they dial out to the relay, no public URL:

```bash
cd apps/agent && npm install
RELAY_URL=wss://<your-relay> OPENROUTER_API_KEY=sk-or-…  \   # key only for llm-inference
  npm run drift -- --name oracle --skills llm-inference
# keyless services need no key:
RELAY_URL=wss://<your-relay> npm run drift -- --name yield-oracle --skills yield-allocator
# then, at the prompt, optionally:  register   (mint ERC-8004 identity for reputation)
```

Set `AGENT_PRIVATE_KEY` on an ephemeral host so the wallet/identity survives restarts.

---

## Notes

- **Keys:** the relay needs none. The web needs only `NEXT_PUBLIC_RELAY_HTTP`. LLM keys
  are per-provider and (in the browser) stay client-side.
- **Chain:** compute/identity = Fuji testnet; Vaultometer deposits = Avalanche mainnet
  (real funds). The sidebar toggle + a "⚠ real funds" badge make the active chain explicit.
- **Trust boundary:** the relay only moves bytes + reports liveness. Identity, reputation,
  and payment settle on-chain; deposits custody in the existing protocol (Aave) — never DRIFT.
