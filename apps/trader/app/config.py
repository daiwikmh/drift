"""Runtime configuration for the DRIFT trading engine."""
from __future__ import annotations

import os

# Bybit V5 kline interval codes, keyed by the friendly timeframe we expose in the UI.
TIMEFRAMES: dict[str, str] = {
    "1m": "1",
    "3m": "3",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "2h": "120",
    "4h": "240",
    "6h": "360",
    "12h": "720",
    "1d": "D",
    "1w": "W",
}

# Approximate bars-per-year for annualising the Sharpe ratio.
BARS_PER_YEAR: dict[str, float] = {
    "1m": 525_600,
    "3m": 175_200,
    "5m": 105_120,
    "15m": 35_040,
    "30m": 17_520,
    "1h": 8_760,
    "2h": 4_380,
    "4h": 2_190,
    "6h": 1_460,
    "12h": 730,
    "1d": 365,
    "1w": 52,
}

# Testnet is the default for everyone; live trading needs user-supplied keys.
BYBIT_TESTNET: bool = os.getenv("BYBIT_TESTNET", "true").lower() != "false"
