"""Thin wrapper over pybit's V5 HTTP session.

Public market data (klines) needs no credentials; trading/wallet calls do.
Keys, when supplied, are held in memory only for the process lifetime.
"""
from __future__ import annotations

import time
from typing import Optional

import pandas as pd
from pybit.unified_trading import HTTP

from .config import TIMEFRAMES


class BybitClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        testnet: bool = True,
    ):
        self.testnet = testnet
        self.api_key = api_key
        self.api_secret = api_secret
        self.session = HTTP(
            testnet=testnet,
            api_key=api_key or None,
            api_secret=api_secret or None,
        )

    # ---- public market data ----

    def klines(self, symbol: str, timeframe: str, bars: int = 720) -> pd.DataFrame:
        """Fetch the most recent `bars` candles, oldest-first.

        Bybit caps each request at 1000 candles, so a single call suffices here.
        """
        if timeframe not in TIMEFRAMES:
            raise ValueError(f"unsupported timeframe: {timeframe}")
        resp = self.session.get_kline(
            category="linear",
            symbol=symbol,
            interval=TIMEFRAMES[timeframe],
            limit=min(bars, 1000),
        )
        rows = resp["result"]["list"]  # newest-first: [start, open, high, low, close, volume, turnover]
        if not rows:
            raise ValueError(f"no kline data for {symbol} {timeframe}")
        df = pd.DataFrame(
            rows,
            columns=["start", "open", "high", "low", "close", "volume", "turnover"],
        )
        df = df.astype(
            {
                "start": "int64",
                "open": "float64",
                "high": "float64",
                "low": "float64",
                "close": "float64",
                "volume": "float64",
            }
        )
        df["time"] = (df["start"] // 1000).astype("int64")  # epoch seconds
        df = df.sort_values("time").reset_index(drop=True)
        return df[["time", "open", "high", "low", "close", "volume"]]

    def last_price(self, symbol: str) -> float:
        resp = self.session.get_tickers(category="linear", symbol=symbol)
        return float(resp["result"]["list"][0]["lastPrice"])

    def tickers(self) -> dict[str, dict]:
        """All linear-perp tickers, keyed by symbol."""
        resp = self.session.get_tickers(category="linear")
        return {r["symbol"]: r for r in resp["result"]["list"]}

    # ---- account / trading (Phase 3) ----

    def wallet_balance(self) -> float:
        resp = self.session.get_wallet_balance(accountType="UNIFIED")
        coins = resp["result"]["list"][0]["coin"]
        usdt = next((c for c in coins if c["coin"] == "USDT"), None)
        return float(usdt["walletBalance"]) if usdt else 0.0

    def account_equity(self) -> float:
        """Total account equity in USDT, including unrealised PnL."""
        resp = self.session.get_wallet_balance(accountType="UNIFIED")
        acct = resp["result"]["list"][0]
        return float(acct.get("totalEquity") or 0.0)

    def place_market_order(self, symbol: str, side: str, qty: float) -> dict:
        resp = self.session.place_order(
            category="linear",
            symbol=symbol,
            side=side,  # "Buy" | "Sell"
            orderType="Market",
            qty=str(qty),
        )
        return resp["result"]

    def position_size(self, symbol: str) -> float:
        resp = self.session.get_positions(category="linear", symbol=symbol)
        lst = resp["result"]["list"]
        if not lst:
            return 0.0
        p = lst[0]
        size = float(p["size"] or 0)
        return size if p["side"] == "Buy" else -size
