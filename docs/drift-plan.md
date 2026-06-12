# DRIFT — Implementation Plan

**Deterministic Risk-bounded Intelligent Financial Trading**
Mantle "AI Trading & Strategy" track. Trading-only. CeFi execution on Bybit.

> Status: planned, not started. Last updated 2026-06-12.

---

## Scope decisions (locked)

- **Trading only.** No RWA-yield work in this product.
- **CeFi execution on Bybit V5 API.** Bybit's API is a centralized-exchange API —
  there is no on-chain "Bybit API" path, so CeFi is the buildable/supported choice.
- **No Solidity.** `MacroGuard.sol` and the on-chain vault are dropped for now.
  Existing DRIP contracts stay on disk (not deleted), but this product doesn't use them.
- **SDK:** `pybit` (official Bybit V5) — unified account, spot + linear perps, REST + WS.
- **Demo/paper:** Bybit **testnet** (`api-testnet.bybit.com`), default for everyone.
- **Live:** user supplies their own Bybit API key/secret (read+trade scope).
- **Python lives at `apps/trader`** in this monorepo (own venv/`requirements.txt`),
  FastAPI ↔ Next.js over local REST/WS.
- **Cockpit lives in the existing `apps/web`** (one unified app), new `/trade` section.
- **Key handling (demo):** live keys held server-side **in memory only** for the
  session, never written to disk. Harden later.

---

## Architecture

```
┌─ apps/web (Next.js)  ── the cockpit ───────────────┐
│  Strategy browser → Config → Backtest → Go Live    │
│  Live monitor: equity curve, positions, fills, log │
└───────────────▲───────────── REST + WebSocket ─────┘
                │
┌─ apps/trader (Python · FastAPI) ── the engine ─────┐
│  StrategyRegistry  (base Strategy.signal())        │
│   ├─ MACD · Dual Thrust · Bollinger · RSI  ← repo  │
│  Backtester  (klines → trades → metrics)           │
│  LiveRunner  (loop: data → signal → risk size →    │
│              place order → track) per bot           │
│  BybitClient (pybit: klines/order/position/wallet) │
└──────────────────▲─────────────────────────────────┘
                   │  Bybit V5 API (testnet / live keys)
```

## Reuse vs. build

- **Reuse:** strategy *math* from `project/private/quant-trading` (MACD, Dual Thrust,
  Bollinger, RSI — Python backtests w/ `main()`); the Next.js design system; the
  dashboard shell/cards.
- **Build new:** Python engine (FastAPI + pybit + backtester + live runner), the 5
  screens, the REST/WS contract.
- **Note:** `private/quant-trading` is its own git repo — port code, do NOT commit it
  into drip.

## The 5 screens

1. **Strategy library** — cards: name, type, blurb, backtest sparkline. Click to configure.
2. **Configure** — symbol (BTCUSDT…), timeframe, params (sliders), position size,
   max-drawdown stop, leverage. Live-validates.
3. **Backtest** — equity curve, drawdown chart, metrics (total return, Sharpe, win
   rate, max DD, # trades), trade markers on price. "Deploy."
4. **Live bot** — running bots; per bot: real-time equity, open positions, fills feed,
   on/off kill-switch, current signal state.
5. **Connection** — Bybit keys (testnet preset / paste live), status, balance.

---

## Phased plan (each phase independently demoable)

### Phase 1 — Python engine skeleton + Bybit data
- `apps/trader`: FastAPI app, `BybitClient` (testnet), pull klines.
- `Strategy` base + port **MACD** as the first strategy.
- `Backtester` returns equity curve + metrics.
- ✅ Verify: `GET /backtest?strategy=macd&symbol=BTCUSDT` returns equity curve +
  Sharpe from real Bybit data.

### Phase 2 — Backtest UI
- `/trade` section: strategy library + configure + backtest screens wired to Phase 1.
- ✅ Verify: configure MACD in browser, run backtest, see equity curve + metrics render.

### Phase 3 — Live execution (testnet)
- `LiveRunner` loop; place/track orders on testnet; position-size + drawdown-stop;
  WebSocket push to UI; start/stop a bot from the UI.
- ✅ Verify: start a bot on testnet, watch a real order fill and equity update live.

### Phase 4 — More strategies + connection screen + polish
- Port Dual Thrust, Bollinger, RSI. Bybit key management (testnet/live). Empty/loading/
  error states, responsive, animations.
- ✅ Verify: switch strategies, connect a live key, full flow feels finished.

### Phase 5 (optional)
- Paper-vs-live toggle, multi-bot, persistence.

---

## REST/WS contract (first cut)

- `GET  /strategies` → list (id, name, type, params schema)
- `POST /backtest` → { strategy, symbol, timeframe, params, range } → { equityCurve, trades, metrics }
- `POST /bots` → start a bot → { botId }
- `GET  /bots` / `GET /bots/{id}` → status, positions, equity, fills
- `DELETE /bots/{id}` → stop (kill-switch)
- `POST /connection` → set Bybit keys (session, in-memory) → { status, balance }
- `WS   /bots/{id}/stream` → live equity / fills / signal-state pushes

## Risk/safety notes
- Testnet-first; live is explicit opt-in.
- Per-bot max-drawdown stop and position cap enforced in `LiveRunner`.
- Honest backtests: strict point-in-time data, no look-ahead (cf. *Profit Mirage*,
  arXiv 2510.07920).
- Keys never logged, never written to disk in the demo build.
