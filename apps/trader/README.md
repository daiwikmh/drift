# DRIFT engine (`apps/trader`)

Python trading engine for DRIFT — FastAPI surface consumed by the Next.js cockpit
in `apps/web` (`/trade`). Backtests read real Bybit market history; live trading
(Phase 3) runs on Bybit **testnet** by default.

## Run

```bash
cd apps/trader
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8099
```

## API

- `GET  /health` — engine status + supported timeframes
- `GET  /strategies` — available strategies + param schema
- `POST /backtest` — `{ strategy, symbol, timeframe, params, bars }` → candles, equity curve, trades, metrics
- `GET  /backtest?strategy=macd&symbol=BTCUSDT` — convenience form for quick checks

## Layout

```
app/
  main.py          FastAPI routes
  config.py        timeframe ↔ Bybit interval map, annualisation
  models.py        pydantic request/response schemas
  bybit_client.py  pybit V5 wrapper (klines now; orders/wallet for Phase 3)
  backtester.py    point-in-time backtest (no look-ahead) → equity + metrics
  live.py          testnet execution: connection + bot manager + runner loop
  strategies/
    base.py        Strategy ABC: OHLCV → target-position series
    macd.py        MACD-oscillator crossover (momentum)
    rsi.py         RSI overbought/oversold (mean reversion)
    bollinger.py   Bollinger-band mean reversion
    dual_thrust.py Dual Thrust breakout (long/short)
    registry.py    strategy registry
```

Strategies are ported from
[je-suis-tm/quant-trading](https://github.com/je-suis-tm/quant-trading).

## Live trading (testnet)

- `GET  /connection` / `POST /connection` — set Bybit keys (in-memory only)
- `GET  /bots` / `POST /bots` / `GET /bots/{id}` / `DELETE /bots/{id}`
- `WS   /bots/{id}/stream` — live equity / position / fills

Bots place **real market orders on Bybit testnet** and read account equity live —
nothing is simulated. A connection (testnet API keys) is required; without one the
UI shows an empty state. Each bot enforces a per-bot max-drawdown stop that flattens
and halts on breach.

Backtests are strictly point-in-time: the position chosen on bar *t* is only
earned over bar *t+1* (no look-ahead), per *Profit Mirage* (arXiv 2510.07920).
