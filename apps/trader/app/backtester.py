"""Vectorised, point-in-time backtester.

Honesty rule (cf. *Profit Mirage*, arXiv 2510.07920): the position decided on
bar *t* is only earned over bar *t+1*. We shift positions forward by one bar so
no signal trades on information from its own candle.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .config import BARS_PER_YEAR
from .models import (
    BacktestResponse,
    Candle,
    EquityPoint,
    Metrics,
    TradeMarker,
)
from .strategies.base import Strategy


def run_backtest(
    strategy: Strategy,
    df: pd.DataFrame,
    symbol: str,
    timeframe: str,
) -> BacktestResponse:
    positions = strategy.positions(df).astype(float)

    # Trade on the next bar's open-to-close; shift removes look-ahead.
    held = positions.shift(1).fillna(0.0)
    bar_return = df["close"].pct_change().fillna(0.0)
    strat_return = held * bar_return

    equity = (1.0 + strat_return).cumprod()
    running_peak = equity.cummax()
    drawdown = equity / running_peak - 1.0

    # --- trade markers + round-trip stats ---
    # Any change away from a non-flat position closes the prior trade (covers
    # long/short flips that never pass through flat, e.g. breakout strategies).
    trades: list[TradeMarker] = []
    prev = 0.0
    wins = 0
    trade_count = 0
    entry_equity = 1.0
    for i in range(len(positions)):
        pos = positions.iloc[i]
        if pos == prev:
            continue
        t = int(df["time"].iloc[i])
        price = float(df["close"].iloc[i])
        if pos > prev:
            side = "long" if pos > 0 else "exit"
        else:
            side = "short" if pos < 0 else "exit"
        trades.append(TradeMarker(time=t, side=side, price=price))
        if prev != 0:  # closing the previous position
            trade_count += 1
            if equity.iloc[i] > entry_equity:
                wins += 1
        if pos != 0:  # opening a new position
            entry_equity = equity.iloc[i]
        prev = pos

    total_return = float(equity.iloc[-1] - 1.0)
    bpy = BARS_PER_YEAR.get(timeframe, 8_760)
    std = float(strat_return.std())
    sharpe = float(strat_return.mean() / std * np.sqrt(bpy)) if std > 0 else 0.0
    max_dd = float(drawdown.min())
    win_rate = float(wins / trade_count) if trade_count else 0.0

    metrics = Metrics(
        total_return=round(total_return, 6),
        sharpe=round(sharpe, 4),
        win_rate=round(win_rate, 4),
        max_drawdown=round(max_dd, 6),
        num_trades=trade_count,
    )

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
    equity_curve = [
        EquityPoint(
            time=int(df["time"].iloc[i]),
            equity=round(float(equity.iloc[i]), 6),
            drawdown=round(float(drawdown.iloc[i]), 6),
        )
        for i in range(len(df))
    ]

    return BacktestResponse(
        strategy=strategy.id,
        symbol=symbol,
        timeframe=timeframe,
        candles=candles,
        equity_curve=equity_curve,
        trades=trades,
        metrics=metrics,
    )
