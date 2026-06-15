"""DRIFT trading engine — FastAPI surface for the Next.js cockpit."""
from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .backtester import run_backtest
from .bybit_client import BybitClient
from .chain import guard as chain_guard
from .config import (
    ALLOWED_ORIGINS,
    BYBIT_API_KEY,
    BYBIT_API_SECRET,
    BYBIT_TESTNET,
    REGIME_POLL_SECONDS,
    TIMEFRAMES,
)
from .live import BotManager, Connection
from .telegram import tg
from . import llm
from . import regime as regime_engine
from .models import (
    BacktestRequest,
    BacktestResponse,
    BotConfig,
    BotStatus,
    Candle,
    ConnectionRequest,
    ConnectionStatus,
    KlinesResponse,
    Market,
    OptimizeRequest,
    OptimizeResponse,
    StrategyInfo,
    TelegramConnectRequest,
    TelegramStatus,
)
from .optimize import optimize as run_optimize
from .strategies.registry import all_strategies, get_strategy

app = FastAPI(title="DRIFT Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public market data needs no keys. Backtests always read mainnet history (testnet
# klines are sparse); only live trading respects the BYBIT_TESTNET default.
_public = BybitClient(testnet=False)

# Live trading state (in-memory; keys never persisted).
_connection = Connection()
_bots = BotManager(_connection)

# Latest macro-regime classification (refreshed by the background loop).
_regime: regime_engine.Regime | None = None


@app.on_event("startup")
def _auto_connect() -> None:
    """Auto-connect from environment keys, if provided, so the cockpit shows
    connected without re-entering keys in the UI."""
    if not (BYBIT_API_KEY and BYBIT_API_SECRET):
        return
    env = "testnet" if BYBIT_TESTNET else "mainnet"
    try:
        bal = _connection.set(BYBIT_API_KEY, BYBIT_API_SECRET, BYBIT_TESTNET)
        print(f"[drift] auto-connected to Bybit {env} · balance {bal} USDT")
    except Exception as e:
        print(f"[drift] auto-connect from env failed ({env}): {e}")


@app.on_event("startup")
async def _regime_loop() -> None:
    """Re-classify the macro regime on a slow cadence and push it on-chain when
    it changes, so MacroGuard's risk-off veto is driven autonomously."""

    async def loop() -> None:
        global _regime
        while True:
            try:
                reg = await asyncio.to_thread(regime_engine.current, _public)
                _regime = reg
                if chain_guard.enabled:
                    onchain = await asyncio.to_thread(chain_guard.current_regime)
                    if onchain is not None and reg.regime != onchain:
                        tx = await asyncio.to_thread(chain_guard.set_regime, reg.regime)
                        print(f"[drift] regime → {reg.label} (on-chain tx {tx})")
                        await asyncio.to_thread(
                            tg.send,
                            f"📊 *Regime → {reg.label}*\nvol\\_z {reg.vol_z:+.2f} · trend {reg.trend:+.4f}\n"
                            f"MacroGuard updated on-chain.",
                        )
            except Exception as e:
                print(f"[drift] regime loop: {e}")
            await asyncio.sleep(REGIME_POLL_SECONDS)

    asyncio.create_task(loop())


@app.on_event("startup")
async def _telegram_control() -> None:
    """Two-way control bot: long-poll Telegram and run commands against the engine.
    Only responds to the bound chat (bound on first /start if none is set yet)."""
    if not tg.token:
        return

    async def loop() -> None:
        offset = None
        while True:
            try:
                updates = await asyncio.to_thread(tg.get_updates, offset, 25)
                for u in updates:
                    offset = u["update_id"] + 1
                    msg = u.get("message") or {}
                    text = (msg.get("text") or "").strip()
                    chat = str(msg.get("chat", {}).get("id", ""))
                    if text:
                        await _handle_tg(text, chat)
            except Exception as e:
                print(f"[drift] telegram loop: {e}")
                await asyncio.sleep(3)

    asyncio.create_task(loop())


async def _handle_tg(text: str, chat: str) -> None:
    parts = text.split()
    cmd, args = parts[0].lower().lstrip("/"), parts[1:]

    # Bind to the first chat that says /start if no chat is configured yet.
    if tg.chat_id is None and cmd == "start":
        tg.chat_id = chat
    # Otherwise only the bound chat may drive the agent.
    if tg.chat_id and chat != str(tg.chat_id):
        return

    reply = lambda t: tg.send_to(chat, t)

    if cmd in ("start", "help"):
        await asyncio.to_thread(reply,
            "*DRIFT agent*\n"
            "/status — connection & wallet\n"
            "/regime — macro regime\n"
            "/markets — live prices\n"
            "/chain — MacroGuard\n"
            "/bots — running bots\n"
            "/analyze `sym` — AI analyst\n"
            "/deploy `strat sym [tf]` — start a bot\n"
            "/kill `id|all` — stop bot(s)")
    elif cmd == "status":
        if _connection.client is None:
            await asyncio.to_thread(reply, "Not connected to Bybit.")
        else:
            bal = await asyncio.to_thread(_connection.client.wallet_balance)
            net = "testnet" if _connection.testnet else "mainnet"
            await asyncio.to_thread(reply, f"Connected · {net} · *{bal:.2f} USDT* · bots {len(_bots.list())}")
    elif cmd == "regime":
        try:
            reg = _regime or await asyncio.to_thread(regime_engine.current, _public)
            await asyncio.to_thread(reply, f"Regime *{reg.label}* · vol\\_z {reg.vol_z:+.2f} · trend {reg.trend:+.4f}")
        except Exception as e:
            await asyncio.to_thread(reply, f"regime error: {e}")
    elif cmd == "markets":
        try:
            rows = await asyncio.to_thread(_public.tickers)
            lines = []
            for s in MARKET_SYMBOLS[:5]:
                r = rows.get(s)
                if r:
                    chg = float(r["price24hPcnt"])
                    lines.append(f"{s} {float(r['lastPrice']):,.2f} ({chg:+.2%})")
            await asyncio.to_thread(reply, "*Markets*\n" + "\n".join(lines))
        except Exception as e:
            await asyncio.to_thread(reply, f"markets error: {e}")
    elif cmd == "chain":
        info = chain_guard.info()
        if info["enabled"]:
            await asyncio.to_thread(reply, f"MacroGuard `{info['address']}`\n{info['explorer']}")
        else:
            await asyncio.to_thread(reply, "On-chain guard off.")
    elif cmd == "bots":
        bots = _bots.list()
        if not bots:
            await asyncio.to_thread(reply, "No bots running.")
        else:
            lines = [f"`{b.id}` {b.config.strategy} {b.config.symbol} · {b.last_signal or '—'} · dd {b.drawdown:+.2%}" for b in bots]
            await asyncio.to_thread(reply, "*Bots*\n" + "\n".join(lines))
    elif cmd == "analyze" and args:
        if not llm.is_enabled():
            return await asyncio.to_thread(reply, "Analyst off — no LLM key.")
        try:
            sym = args[0].upper()
            sym = sym if "USDT" in sym else sym + "USDT"
            df = await asyncio.to_thread(_public.klines, sym, regime_engine.MACRO_TIMEFRAME, regime_engine.BARS)
            reg = regime_engine.classify(df)
            text_out = await asyncio.to_thread(llm.analyze, sym, reg)
            await asyncio.to_thread(reply, f"*{sym}* · {reg.label}\n{text_out}")
        except Exception as e:
            await asyncio.to_thread(reply, f"analyze error: {e}")
    elif cmd == "deploy" and len(args) >= 2:
        try:
            cfg = BotConfig(strategy=args[0], symbol=(args[1].upper() if "USDT" in args[1].upper() else args[1].upper() + "USDT"),
                            timeframe=args[2] if len(args) > 2 else "1h")
            bot = _bots.start(cfg)
            await asyncio.to_thread(reply, f"Deployed `{bot.id}` · {cfg.strategy} {cfg.symbol} {cfg.timeframe}")
        except Exception as e:
            await asyncio.to_thread(reply, f"deploy failed: {e}")
    elif cmd == "kill" and args:
        if args[0] == "all":
            for b in list(_bots.list()):
                await _bots.stop(b.id)
            await asyncio.to_thread(reply, "All bots stopped.")
        else:
            ok = await _bots.stop(args[0])
            await asyncio.to_thread(reply, f"Stopped `{args[0]}`." if ok else "Bot not found.")
    else:
        await asyncio.to_thread(reply, "Unknown command. Send /help.")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "testnet": BYBIT_TESTNET, "timeframes": list(TIMEFRAMES)}


@app.get("/chain")
def chain() -> dict:
    """MacroGuard status so the cockpit can link the on-chain decision log."""
    return chain_guard.info()


@app.get("/regime")
def regime() -> dict:
    """Current macro regime (cached from the loop; computed on demand if cold)."""
    reg = _regime
    if reg is None:
        try:
            reg = regime_engine.current(_public)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"regime: {e}")
    on_chain = chain_guard.current_regime()
    return {**reg.as_dict(), "on_chain": on_chain, "synced": on_chain == reg.regime}


@app.get("/telegram", response_model=TelegramStatus)
def telegram_status() -> TelegramStatus:
    return TelegramStatus(**tg.info())


@app.post("/telegram", response_model=TelegramStatus)
def telegram_connect(req: TelegramConnectRequest) -> TelegramStatus:
    try:
        tg.configure(req.token, req.chat_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"telegram: {e}")
    return TelegramStatus(**tg.info())


@app.post("/telegram/test")
def telegram_test() -> dict:
    if not tg.is_enabled():
        raise HTTPException(status_code=400, detail="not connected (need token + chat_id)")
    ok = tg.send("✅ DRIFT connected. You'll get alerts here. Send /help for commands.")
    if not ok:
        raise HTTPException(status_code=502, detail="send failed — check the chat_id")
    return {"sent": True}


@app.post("/analyze")
def analyze(symbol: str = "BTCUSDT") -> dict:
    """LLM analyst: a grounded rationale over the live regime. Advisory only."""
    if not llm.is_enabled():
        raise HTTPException(status_code=503, detail="LLM analyst not configured (set OPENROUTER_API_KEY or NVIDIA_API_KEY)")
    try:
        df = _public.klines(symbol, regime_engine.MACRO_TIMEFRAME, regime_engine.BARS)
        reg = regime_engine.classify(df)
        change24h = _public.tickers().get(symbol, {}).get("price24hPcnt")
        text = llm.analyze(symbol, reg, float(change24h) if change24h is not None else None)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"analyze: {e}")
    return {"symbol": symbol, "regime": reg.label, "analysis": text}


@app.get("/strategies", response_model=list[StrategyInfo])
def strategies() -> list[StrategyInfo]:
    return [StrategyInfo(**s.info()) for s in all_strategies()]


# Symbols offered in the cockpit's Markets view.
MARKET_SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "MNTUSDT",
    "XRPUSDT", "DOGEUSDT", "BNBUSDT", "ARBUSDT",
]


@app.get("/markets", response_model=list[Market])
def markets() -> list[Market]:
    try:
        rows = _public.tickers()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"bybit: {e}")
    out: list[Market] = []
    for sym in MARKET_SYMBOLS:
        r = rows.get(sym)
        if not r:
            continue
        out.append(
            Market(
                symbol=sym,
                last=float(r["lastPrice"]),
                change24h=float(r["price24hPcnt"]),
                high24h=float(r["highPrice24h"]),
                low24h=float(r["lowPrice24h"]),
                volume24h=float(r["turnover24h"]),
            )
        )
    return out


@app.get("/klines", response_model=KlinesResponse)
def klines(symbol: str = "BTCUSDT", timeframe: str = "1h", bars: int = 200) -> KlinesResponse:
    try:
        df = _public.klines(symbol, timeframe, bars)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"bybit: {e}")
    candles = [
        Candle(
            time=int(r.time),
            open=float(r.open),
            high=float(r.high),
            low=float(r.low),
            close=float(r.close),
            volume=float(r.volume),
        )
        for r in df.itertuples()
    ]
    return KlinesResponse(symbol=symbol, timeframe=timeframe, candles=candles)


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


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest) -> OptimizeResponse:
    try:
        df = _public.klines(req.symbol, req.timeframe, req.bars)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"bybit: {e}")
    return run_optimize(df, req.symbol, req.timeframe, req.train_frac)


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
async def start_bot(config: BotConfig) -> BotStatus:
    # async so the bot's asyncio task is created on the running event loop.
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
