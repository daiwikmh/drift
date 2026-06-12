"""Dual Thrust breakout.

Ported from je-suis-tm/quant-trading `Dual Thrust backtest.py`, adapted from its
intraday London-session form to per-bar klines: a breakout range is built from the
last `window` bars, then we go long/short when price breaks the prior close ± k·range.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..models import ParamSpec
from .base import Strategy


class DualThrustStrategy(Strategy):
    id = "dual_thrust"
    name = "Dual Thrust"
    type = "Breakout"
    blurb = "Long/short breakout of the prior close ± k·range over a rolling window."
    param_specs = [
        ParamSpec(key="window", label="Range window", default=5, min=2, max=40, step=1),
        ParamSpec(key="k", label="Trigger k", default=0.5, min=0.1, max=1.0, step=0.1),
    ]

    def positions(self, df: pd.DataFrame) -> pd.Series:
        n = int(self.params["window"])
        k = float(self.params["k"])
        hh = df["high"].rolling(n).max()
        lc = df["close"].rolling(n).min()
        hc = df["close"].rolling(n).max()
        ll = df["low"].rolling(n).min()
        rng = np.maximum(hh - lc, hc - ll)

        ref = df["close"].shift(1)  # prior close as the day's reference
        upper = ref + k * rng
        lower = ref - k * rng
        close = df["close"]

        sig = pd.Series(index=df.index, dtype="float64")
        sig[close > upper] = 1.0
        sig[close < lower] = -1.0
        pos = sig.ffill().fillna(0.0)
        pos.iloc[:n] = 0.0
        return pos.astype(int)
