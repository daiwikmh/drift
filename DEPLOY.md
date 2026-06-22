# Deploying DRIFT

DRIFT has three roles. Only the **relay** and the **web** need hosting; **providers**
run anywhere (laptop included) because inference is proxied through the relay.

```
            ┌─────────────────────────────┐
  buyer ───▶│  web (Vercel)               │
  (browser) │  NEXT_PUBLIC_RELAY_HTTP ─────┐
            └─────────────────────────────┘│
                                            ▼
                              ┌───────────────────────────┐
                              │  relay (Railway)          │  wss + https
                              │  /providers · /infer/:addr │
                              └───────────────────────────┘
                                            ▲ ws (dial-out)
                              ┌───────────────────────────┐
                              │  provider agent (anywhere) │  no public URL needed
                              │  drift agent --skills …    │
                              └───────────────────────────┘
```

---

## 1. Relay → Railway

The relay is `apps/agent` run as `drift relay`. It serves WebSocket **and** HTTP on
one port and reads `$PORT` (which Railway injects).

1. New Railway project → **Deploy from repo**.
2. Set the service **root directory** to `apps/agent` (it ships a `Dockerfile` +
   `railway.json`; Railway builds the image and runs `node dist/cli.js relay`).
3. Deploy, then **Settings → Networking → Generate Domain**. You'll get something like
   `drift-relay-production.up.railway.app`.

That domain serves both `https://…/providers` and `wss://…` (same port, TLS by Railway).

> Self-hosting instead? `docker build -t drift-relay apps/agent && docker run -p 8787:8787 drift-relay`.

## 2. Web → Vercel

1. New Vercel project from the repo, **root directory** `apps/web` (framework
   auto-detected as Next.js).
2. Add an env var:
   - `NEXT_PUBLIC_RELAY_HTTP = https://<your-relay>.up.railway.app`
3. Deploy. The site lists providers and proxies every buy through that relay.

## 3. Providers → anywhere

A provider needs no hosting — just point it at the deployed relay:

```bash
cd apps/agent && npm install
RELAY_URL=wss://<your-relay>.up.railway.app \
OPENROUTER_API_KEY=sk-or-…  \              # or NVIDIA_API_KEY=nvapi-…
  npm run drift -- --name oracle --skills llm-inference
# then, at the prompt:
> register        # mint ERC-8004 identity so buyers can rank you by reputation
```

The agent dials **out** to the relay (NAT-safe) and answers inference requests over
that connection. Buyers reach it at `https://<relay>/infer/<address>` — no inbound
ports, no public URL on the provider.

---

## Notes

- **Chain:** everything is Avalanche **Fuji** testnet. Providers need a little AVAX for
  gas (on-chain register / USDC settlement); buyers need AVAX to pay per call —
  [faucet](https://core.app/tools/testnet-faucet/).
- **Wallets:** each agent auto-creates a persisted wallet under `~/.drift`. On an
  ephemeral host, set `AGENT_PRIVATE_KEY` so the identity/funds survive restarts.
- **Trust boundary:** the relay only moves bytes + reports liveness. Identity,
  reputation, and payment all settle on-chain — a compromised relay cannot forge them.
