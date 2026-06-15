"""Automated macro-regime engine.

Classifies the market into risk-off / neutral / risk-on from BTC price action —
how extreme current realised volatility is (z-score) plus the prevailing trend —
then drives MacroGuard.setRegime on-chain when the regime flips. Deterministic
and transparent: no model fitting, the rule reads off a single slide.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .bybit_client import BybitClient

# Solidity Regime enum: RiskOff=0, Neutral=1, RiskOn=2.
RISK_OFF, NEUTRAL, RISK_ON = 0, 1, 2
LABELS = {RISK_OFF: "risk-off", NEUTRAL: "neutral", RISK_ON: "risk-on"}

MACRO_SYMBOL = "BTCUSDT"  # the market bellwether
MACRO_TIMEFRAME = "1h"
BARS = 500
VOL_WINDOW = 24  # realised-vol window (~1 day of hourly bars)
TREND_WINDOW = 48  # EWMA span for the trend read
VOL_Z_HOT = 1.0  # vol z-score above this = turbulent → risk-off


@dataclass
class Regime:
    regime: int
    label: str
    vol_z: float
    trend: float
    price: float

    def as_dict(self) -> dict:
        return {
            "regime": self.regime,
            "label": self.label,
            "vol_z": round(self.vol_z, 3),
            "trend": round(self.trend, 5),
            "price": self.price,
        }


def classify(df: pd.DataFrame) -> Regime:
    close = df["close"].astype(float)
    ret = np.log(close).diff()

    # How extreme is current volatility versus its own recent distribution?
    rvol = ret.rolling(VOL_WINDOW).std()
    vol_std = rvol.std()
    vol_z = float((rvol.iloc[-1] - rvol.mean()) / vol_std) if vol_std > 0 else 0.0

    # Trend: fractional change in the EWMA over the trend window.
    ewma = close.ewm(span=TREND_WINDOW).mean()
    trend = float(ewma.iloc[-1] / ewma.iloc[-TREND_WINDOW] - 1.0)

    if vol_z > VOL_Z_HOT:
        regime = RISK_OFF
    elif vol_z < 0.0 and trend > 0.0:
        regime = RISK_ON
    else:
        regime = NEUTRAL

    return Regime(regime, LABELS[regime], vol_z, trend, float(close.iloc[-1]))


def current(client: BybitClient) -> Regime:
    """Classify the live regime from fresh BTC klines."""
    df = client.klines(MACRO_SYMBOL, MACRO_TIMEFRAME, BARS)
    return classify(df)
