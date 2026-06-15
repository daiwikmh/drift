<div align="center">

# DRIFT — Showcase

### AI quant bots + macro-driven smart contracts on Bybit — with backtests that don't lie.

*A visual walkthrough of the terminal agent and the web cockpit.*

</div>

---

## What you're looking at

DRIFT ships as **three things on one engine**:

- **A terminal agent** (`./drift`) — an immersive full-screen REPL with live markets, point-in-time backtests, an AI analyst, and live testnet bots. Just talk to it.
- **A web cockpit** (`apps/web`) — a consumer dashboard with candlestick charts, per-bot equity streams, and a one-click Auto-Research optimizer.
- **A Python FastAPI engine** (`apps/trader`) — the shared brain: strategy library, backtester, live bot runner, MacroGuard wiring, LLM analyst, and Telegram control bot.

Every backtest runs on real Bybit market history under strict point-in-time rules, every live trade decision is recorded on-chain by `MacroGuard.sol` on Mantle Sepolia, and the LLM analyst explains but never executes.

---

## The terminal (`./drift`)

Full-screen alternate-screen REPL — a pinned `sys` header, a live status bar (BTC/ETH/SOL prices), and a scroll region in between. `readline` editing and history at the `>` prompt. Type a command, or just talk to it.

> **Key commands:** `markets` · `chart <sym>` · `strategies` · `backtest <strat> <sym>` · `research <sym>` · `analyze <sym>` · `bot <strat> <sym>` · `chain` · `telegram` — anything else routes to the conversational agent.

<!-- ───────────────────────────────────────────────────────────── -->
<!-- 📸  CLI SCREENSHOTS — drop images below (e.g. ./docs/img/cli-*.png) -->
<!-- ───────────────────────────────────────────────────────────── -->

### Live markets & startup

<!-- ![DRIFT terminal — live markets](./docs/img/cli-markets.png) -->

_(screenshot here)_

<br>

### Point-in-time backtest + equity chart

<!-- ![DRIFT terminal — backtest](./docs/img/cli-backtest.png) -->

_(screenshot here)_

<br>

### Auto-Research optimizer (train/test leaderboard)

<!-- ![DRIFT terminal — research](./docs/img/cli-research.png) -->

_(screenshot here)_

<br>

### LLM analyst over the live regime

<!-- ![DRIFT terminal — analyze](./docs/img/cli-analyze.png) -->

_(screenshot here)_

<br>

### Live bot + on-chain MacroGuard

<!-- ![DRIFT terminal — live bot](./docs/img/cli-bot.png) -->

_(screenshot here)_

---

## The web cockpit (`apps/web`)

A Next.js 16 dashboard reading the engine over REST + WebSocket. Candlestick charts, per-bot equity streams, and the optimizer in the browser.

| Route | What it does |
|-------|--------------|
| `/` | Landing — what DRIFT is and why honest backtests matter |
| `/dashboard` | **Markets** — live prices, candlestick, deploy a bot inline |
| `/dashboard/bots` | **Bots** — per-bot candlestick with fill markers, equity, P&L, MacroGuard badge |
| `/dashboard/portfolio` | **Portfolio** — account equity, running bots, positions, live P&L |
| `/dashboard/backtest` | **Research** — Auto-Research optimizer + manual backtest cockpit |
| `/dashboard/connection` | **Connection** — Bybit keys, MacroGuard status, Telegram |

<!-- ───────────────────────────────────────────────────────────── -->
<!-- 📸  WEB SCREENSHOTS — drop images below (e.g. ./docs/img/web-*.png) -->
<!-- ───────────────────────────────────────────────────────────── -->

### Landing page

<!-- ![DRIFT web — landing](./docs/img/web-landing.png) -->

_(screenshot here)_

<br>

### Markets dashboard

<!-- ![DRIFT web — markets](./docs/img/web-markets.png) -->

_(screenshot here)_

<br>

### Bots — candlestick with fill markers + equity

<!-- ![DRIFT web — bots](./docs/img/web-bots.png) -->

_(screenshot here)_

<br>

### Research — Auto-Research optimizer

<!-- ![DRIFT web — research](./docs/img/web-research.png) -->

_(screenshot here)_

<br>

### Portfolio

<!-- ![DRIFT web — portfolio](./docs/img/web-portfolio.png) -->

_(screenshot here)_

<br>

### Connection — Bybit, MacroGuard, Telegram

<!-- ![DRIFT web — connection](./docs/img/web-connection.png) -->

_(screenshot here)_

---

## On-chain proof (Mantle Sepolia)

`MacroGuard.sol` is deployed at [`0x4011cbAc551541ae6116db3a0a4f543F89fE7ab3`](https://sepolia.mantlescan.xyz/address/0x4011cbAc551541ae6116db3a0a4f543F89fE7ab3) on Mantle Sepolia (chain 5003). Every bot tick records a tamper-proof decision; the regime engine autonomously pushes `setRegime` when market conditions flip.

<!-- ![MacroGuard on Mantlescan](./docs/img/chain-macroguard.png) -->

_(screenshot here)_

---

<div align="center">
<sub>See the <a href="./README.md">README</a> for full docs · Strategies ported from <a href="https://github.com/je-suis-tm/quant-trading">je-suis-tm/quant-trading</a> · Built on <a href="https://bybit-exchange.github.io/docs/v5/intro">Bybit V5</a></sub>
</div>
