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


class Market(BaseModel):
    symbol: str
    last: float
    change24h: float  # fraction, e.g. 0.0123 = +1.23%
    high24h: float
    low24h: float
    volume24h: float  # quote turnover


class KlinesResponse(BaseModel):
    symbol: str
    timeframe: str
    candles: list[Candle]


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


class OptimizeRequest(BaseModel):
    symbol: str = "BTCUSDT"
    timeframe: str = "1h"
    bars: int = Field(default=720, ge=200, le=1000)
    train_frac: float = Field(default=0.7, ge=0.4, le=0.85)


class SliceMetrics(BaseModel):
    total_return: float
    sharpe: float
    max_drawdown: float
    num_trades: int


class OptimizeResult(BaseModel):
    strategy: str
    name: str
    params: dict[str, float]
    in_sample: SliceMetrics
    out_of_sample: SliceMetrics
    verdict: str  # "robust" | "overfit" | "weak"
    equity: list[EquityPoint]  # full-series, downsampled
    split_index: int  # index into equity where test begins


class OptimizeResponse(BaseModel):
    symbol: str
    timeframe: str
    train_frac: float
    results: list[OptimizeResult]


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


class TelegramConnectRequest(BaseModel):
    token: str
    chat_id: Optional[str] = None


class TelegramStatus(BaseModel):
    enabled: bool
    configured: bool
    chat_id: Optional[str] = None
    username: Optional[str] = None


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
    last_chain_tx: Optional[str] = None
    chain_vetoed: bool = False
