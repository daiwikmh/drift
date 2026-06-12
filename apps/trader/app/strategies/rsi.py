"""RSI overbought/oversold.

Ported from je-suis-tm/quant-trading `RSI Pattern Recognition backtest.py`: RSI on
Wilder's smoothed moving average. Go long when oversold, flat when overbought.
"""
from __future__ import annotations

import pandas as pd

from ..models import ParamSpec
from .base import Strategy


def _rsi(close: pd.Series, n: int) -> pd.Series:
    delta = close.diff()
    up = delta.clip(lower=0)
    down = -delta.clip(upper=0)
    # Wilder's smoothing == EWMA with alpha = 1/n.
    avg_up = up.ewm(alpha=1 / n, adjust=False).mean()
    avg_down = down.ewm(alpha=1 / n, adjust=False).mean()
    rs = avg_up / avg_down.replace(0, 1e-9)
    return 100 - 100 / (1 + rs)


class RsiStrategy(Strategy):
    id = "rsi"
    name = "RSI Reversion"
    type = "Mean reversion"
    blurb = "Long when RSI is oversold, exit when overbought. Wilder's smoothing."
    param_specs = [
        ParamSpec(key="period", label="RSI period", default=14, min=2, max=50, step=1),
        ParamSpec(key="oversold", label="Oversold", default=30, min=5, max=45, step=1),
        ParamSpec(key="overbought", label="Overbought", default=70, min=55, max=95, step=1),
    ]

    def positions(self, df: pd.DataFrame) -> pd.Series:
        n = int(self.params["period"])
        lo = self.params["oversold"]
        hi = self.params["overbought"]
        rsi = _rsi(df["close"], n)
        sig = pd.Series(index=df.index, dtype="float64")
        sig[rsi < lo] = 1.0   # enter long
        sig[rsi > hi] = 0.0   # exit
        pos = sig.ffill().fillna(0.0)
        pos.iloc[:n] = 0.0
        return pos.astype(int)
