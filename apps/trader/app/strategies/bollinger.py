"""Bollinger Bands mean reversion.

Ported from je-suis-tm/quant-trading `Bollinger Bands Pattern Recognition`: bands at
mid ± k·σ. Go long when price closes below the lower band; exit on a return to the
middle band.
"""
from __future__ import annotations

import pandas as pd

from ..models import ParamSpec
from .base import Strategy


class BollingerStrategy(Strategy):
    id = "bollinger"
    name = "Bollinger Reversion"
    type = "Mean reversion"
    blurb = "Buy a close below the lower band; exit back at the middle band."
    param_specs = [
        ParamSpec(key="window", label="Window", default=20, min=5, max=100, step=1),
        ParamSpec(key="k", label="Std devs", default=2, min=1, max=4, step=0.5),
    ]

    def positions(self, df: pd.DataFrame) -> pd.Series:
        n = int(self.params["window"])
        k = float(self.params["k"])
        mid = df["close"].rolling(n, min_periods=n).mean()
        std = df["close"].rolling(n, min_periods=n).std()
        lower = mid - k * std
        close = df["close"]

        sig = pd.Series(index=df.index, dtype="float64")
        sig[close < lower] = 1.0      # oversold → enter long
        sig[close >= mid] = 0.0       # reverted to mean → exit
        pos = sig.ffill().fillna(0.0)
        pos.iloc[:n] = 0.0
        return pos.astype(int)
