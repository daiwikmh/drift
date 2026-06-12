"""Pydantic schemas for the REST/WS contract."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class ParamSpec(BaseModel):
    key: str
    label: str
    type: str = "number"
    default: float
    min: float
    max: float
    step: float = 1.0


class StrategyInfo(BaseModel):
    id: str
    name: str
    type: str
    blurb: str
    params: list[ParamSpec]


class BacktestRequest(BaseModel):
    strategy: str
    symbol: str = "BTCUSDT"
    timeframe: str = "1h"
    params: dict[str, float] = Field(default_factory=dict)
    bars: int = Field(default=720, ge=50, le=1000)


class Candle(BaseModel):
    time: int  # epoch seconds
    open: float
    high: float
    low: float
    close: float
    volume: float


class EquityPoint(BaseModel):
    time: int
    equity: float
    drawdown: float


class TradeMarker(BaseModel):
    time: int
    side: str  # "long" | "short" | "exit"
    price: float


class Metrics(BaseModel):
    total_return: float
    sharpe: float
    win_rate: float
    max_drawdown: float
    num_trades: int


class BacktestResponse(BaseModel):
    strategy: str
    symbol: str
    timeframe: str
    candles: list[Candle]
    equity_curve: list[EquityPoint]
    trades: list[TradeMarker]
    metrics: Metrics


# ---- live trading (Phase 3) ----

class ConnectionRequest(BaseModel):
    api_key: str
    api_secret: str
    testnet: bool = True


class ConnectionStatus(BaseModel):
    connected: bool
    testnet: bool
    balance: Optional[float] = None
    error: Optional[str] = None


class BotConfig(BaseModel):
    strategy: str
    symbol: str = "BTCUSDT"
    timeframe: str = "1h"
    params: dict[str, float] = Field(default_factory=dict)
    qty: float = Field(default=0.001, gt=0)
    max_drawdown: float = Field(default=0.2, gt=0, le=1)


class BotStatus(BaseModel):
    id: str
    config: BotConfig
    running: bool
    position: int
    equity: float
    peak_equity: float
    drawdown: float
    last_signal: Optional[str] = None
    last_price: Optional[float] = None
    fills: list[dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
