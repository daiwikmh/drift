"""Live execution on Bybit testnet.

A connection holds one authenticated client in memory (keys never touch disk).
Each bot runs an asyncio task that, every poll, recomputes its strategy's target
position from the latest klines and places a real market order to reach it.
Equity is read from the account (real, including unrealised PnL) — nothing is
simulated. A per-bot drawdown stop flattens and halts the bot.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

from .bybit_client import BybitClient
from .models import BotConfig, BotStatus
from .strategies.registry import get_strategy

POLL_SECONDS = 15  # how often each bot re-evaluates its signal


class Connection:
    """In-memory Bybit session for the running process."""

    def __init__(self) -> None:
        self.client: Optional[BybitClient] = None
        self.testnet: bool = True

    def set(self, api_key: str, api_secret: str, testnet: bool) -> float:
        client = BybitClient(api_key=api_key, api_secret=api_secret, testnet=testnet)
        balance = client.wallet_balance()  # raises if creds are bad
        self.client = client
        self.testnet = testnet
        return balance

    def require(self) -> BybitClient:
        if self.client is None:
            raise RuntimeError("not connected — set Bybit API keys first")
        return self.client


@dataclass
class Bot:
    id: str
    config: BotConfig
    running: bool = True
    position: int = 0
    equity: float = 0.0
    peak_equity: float = 0.0
    drawdown: float = 0.0
    last_signal: Optional[str] = None
    last_price: Optional[float] = None
    error: Optional[str] = None
    fills: list[dict] = field(default_factory=list)
    task: Optional[asyncio.Task] = None

    def status(self) -> BotStatus:
        return BotStatus(
            id=self.id,
            config=self.config,
            running=self.running,
            position=self.position,
            equity=round(self.equity, 4),
            peak_equity=round(self.peak_equity, 4),
            drawdown=round(self.drawdown, 6),
            last_signal=self.last_signal,
            last_price=self.last_price,
            fills=self.fills[-20:],
            error=self.error,
        )


class BotManager:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection
        self.bots: dict[str, Bot] = {}

    def start(self, config: BotConfig) -> Bot:
        client = self.connection.require()
        bot = Bot(id=uuid.uuid4().hex[:8], config=config)
        bot.task = asyncio.create_task(self._run(bot, client))
        self.bots[bot.id] = bot
        return bot

    def get(self, bot_id: str) -> Optional[Bot]:
        return self.bots.get(bot_id)

    def list(self) -> list[Bot]:
        return list(self.bots.values())

    async def stop(self, bot_id: str) -> bool:
        bot = self.bots.get(bot_id)
        if not bot:
            return False
        bot.running = False
        if bot.task:
            bot.task.cancel()
        # Flatten any open position on the way out.
        try:
            if bot.position != 0:
                await self._flatten(bot, self.connection.require())
        except Exception:
            pass
        return True

    # ------------------------------------------------------------------ loop --

    async def _run(self, bot: Bot, client: BybitClient) -> None:
        strat = get_strategy(bot.config.strategy, bot.config.params)
        try:
            bot.equity = await asyncio.to_thread(client.account_equity)
            bot.peak_equity = bot.equity
            bot.position = _sign(await asyncio.to_thread(client.position_size, bot.config.symbol))
        except Exception as e:
            bot.error = str(e)
            bot.running = False
            return

        while bot.running:
            try:
                await self._tick(bot, client, strat)
            except asyncio.CancelledError:
                break
            except Exception as e:
                bot.error = str(e)
            await asyncio.sleep(POLL_SECONDS)

    async def _tick(self, bot: Bot, client: BybitClient, strat) -> None:
        df = await asyncio.to_thread(
            client.klines, bot.config.symbol, bot.config.timeframe, 200
        )
        target = int(strat.positions(df).iloc[-1])
        price = float(df["close"].iloc[-1])
        bot.last_price = price
        bot.last_signal = {1: "long", -1: "short", 0: "flat"}[target]

        if target != bot.position:
            await self._rebalance(bot, client, target, price)

        bot.equity = await asyncio.to_thread(client.account_equity)
        bot.peak_equity = max(bot.peak_equity, bot.equity)
        bot.drawdown = bot.equity / bot.peak_equity - 1.0 if bot.peak_equity else 0.0

        if bot.drawdown <= -bot.config.max_drawdown:
            bot.error = f"drawdown stop hit ({bot.drawdown:.2%})"
            await self._flatten(bot, client)
            bot.running = False

    async def _rebalance(self, bot: Bot, client: BybitClient, target: int, price: float) -> None:
        delta = target - bot.position  # in units of config.qty
        side = "Buy" if delta > 0 else "Sell"
        qty = round(bot.config.qty * abs(delta), 8)
        await asyncio.to_thread(client.place_market_order, bot.config.symbol, side, qty)
        bot.position = target
        bot.fills.append(
            {"ts": int(time.time()), "side": side, "qty": qty, "price": price, "target": target}
        )

    async def _flatten(self, bot: Bot, client: BybitClient) -> None:
        if bot.position == 0:
            return
        side = "Sell" if bot.position > 0 else "Buy"
        qty = round(bot.config.qty * abs(bot.position), 8)
        await asyncio.to_thread(client.place_market_order, bot.config.symbol, side, qty)
        bot.fills.append(
            {"ts": int(time.time()), "side": side, "qty": qty, "price": bot.last_price, "target": 0, "flatten": True}
        )
        bot.position = 0


def _sign(x: float) -> int:
    return 1 if x > 0 else -1 if x < 0 else 0
