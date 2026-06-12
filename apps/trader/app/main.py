"""DRIFT trading engine — FastAPI surface for the Next.js cockpit."""
from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .backtester import run_backtest
from .bybit_client import BybitClient
from .config import BYBIT_TESTNET, TIMEFRAMES
from .live import BotManager, Connection
from .models import (
    BacktestRequest,
    BacktestResponse,
    BotConfig,
    BotStatus,
    ConnectionRequest,
    ConnectionStatus,
    StrategyInfo,
)
from .strategies.registry import all_strategies, get_strategy

app = FastAPI(title="DRIFT Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public market data needs no keys. Backtests always read mainnet history (testnet
# klines are sparse); only live trading respects the BYBIT_TESTNET default.
_public = BybitClient(testnet=False)

# Live trading state (in-memory; keys never persisted).
_connection = Connection()
_bots = BotManager(_connection)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "testnet": BYBIT_TESTNET, "timeframes": list(TIMEFRAMES)}


@app.get("/strategies", response_model=list[StrategyInfo])
def strategies() -> list[StrategyInfo]:
    return [StrategyInfo(**s.info()) for s in all_strategies()]


@app.post("/backtest", response_model=BacktestResponse)
def backtest(req: BacktestRequest) -> BacktestResponse:
    try:
        strat = get_strategy(req.strategy, req.params)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    try:
        df = _public.klines(req.symbol, req.timeframe, req.bars)
    except Exception as e:  # network / bad symbol / bad timeframe
        raise HTTPException(status_code=502, detail=f"bybit: {e}")
    return run_backtest(strat, df, req.symbol, req.timeframe)


# Convenience GET for quick verification: /backtest?strategy=macd&symbol=BTCUSDT
@app.get("/backtest", response_model=BacktestResponse)
def backtest_get(
    strategy: str = "macd",
    symbol: str = "BTCUSDT",
    timeframe: str = "1h",
    bars: int = 720,
) -> BacktestResponse:
    return backtest(
        BacktestRequest(strategy=strategy, symbol=symbol, timeframe=timeframe, bars=bars)
    )


# ----------------------------------------------------------------- live ----

@app.get("/connection", response_model=ConnectionStatus)
def connection_status() -> ConnectionStatus:
    if _connection.client is None:
        return ConnectionStatus(connected=False, testnet=_connection.testnet)
    try:
        bal = _connection.client.wallet_balance()
        return ConnectionStatus(connected=True, testnet=_connection.testnet, balance=bal)
    except Exception as e:
        return ConnectionStatus(connected=False, testnet=_connection.testnet, error=str(e))


@app.post("/connection", response_model=ConnectionStatus)
def set_connection(req: ConnectionRequest) -> ConnectionStatus:
    try:
        bal = _connection.set(req.api_key, req.api_secret, req.testnet)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"connection failed: {e}")
    return ConnectionStatus(connected=True, testnet=req.testnet, balance=bal)


@app.get("/bots", response_model=list[BotStatus])
def list_bots() -> list[BotStatus]:
    return [b.status() for b in _bots.list()]


@app.post("/bots", response_model=BotStatus)
def start_bot(config: BotConfig) -> BotStatus:
    try:
        strat_ok = config.strategy in {s.id for s in all_strategies()}
        if not strat_ok:
            raise ValueError(f"unknown strategy: {config.strategy}")
        bot = _bots.start(config)
    except RuntimeError as e:  # not connected
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return bot.status()


@app.get("/bots/{bot_id}", response_model=BotStatus)
def get_bot(bot_id: str) -> BotStatus:
    bot = _bots.get(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="bot not found")
    return bot.status()


@app.delete("/bots/{bot_id}")
async def stop_bot(bot_id: str) -> dict:
    ok = await _bots.stop(bot_id)
    if not ok:
        raise HTTPException(status_code=404, detail="bot not found")
    return {"stopped": bot_id}


@app.websocket("/bots/{bot_id}/stream")
async def bot_stream(ws: WebSocket, bot_id: str) -> None:
    await ws.accept()
    bot = _bots.get(bot_id)
    if not bot:
        await ws.close(code=4404)
        return
    try:
        while True:
            await ws.send_json(bot.status().model_dump())
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
