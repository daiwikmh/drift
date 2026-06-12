"""MACD-oscillator crossover.

Ported from je-suis-tm/quant-trading `MACD Oscillator backtest.py`: a fast/slow
moving-average crossover where the oscillator is (fast - slow). Long while the
fast average is above the slow one, flat otherwise.
"""
from __future__ import annotations

import pandas as pd

from ..models import ParamSpec
from .base import Strategy


class MacdStrategy(Strategy):
    id = "macd"
    name = "MACD Oscillator"
    type = "Momentum"
    blurb = "Fast/slow moving-average crossover. Long while momentum (fast − slow) is positive."
    param_specs = [
        ParamSpec(key="fast", label="Fast MA", default=10, min=2, max=100, step=1),
        ParamSpec(key="slow", label="Slow MA", default=21, min=5, max=200, step=1),
    ]

    def positions(self, df: pd.DataFrame) -> pd.Series:
        fast = int(self.params["fast"])
        slow = int(self.params["slow"])
        ma_fast = df["close"].rolling(window=fast, min_periods=1).mean()
        ma_slow = df["close"].rolling(window=slow, min_periods=1).mean()
        pos = (ma_fast >= ma_slow).astype(int)
        # No position until the slow window has enough history to be meaningful.
        pos.iloc[:slow] = 0
        return pos
