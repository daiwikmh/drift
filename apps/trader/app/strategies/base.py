"""Strategy base class.

A strategy turns an OHLCV frame into a `position` series in {-1, 0, 1}:
the target position to *hold over the next bar*. The backtester and live runner
both consume that series, so the same code path drives backtest and execution.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd

from ..models import ParamSpec


class Strategy(ABC):
    id: str
    name: str
    type: str
    blurb: str
    param_specs: list[ParamSpec]

    def __init__(self, params: dict[str, float] | None = None):
        merged = {p.key: p.default for p in self.param_specs}
        if params:
            merged.update({k: v for k, v in params.items() if k in merged})
        self.params = merged

    @abstractmethod
    def positions(self, df: pd.DataFrame) -> pd.Series:
        """Return an integer Series (index-aligned to df) of target positions."""

    @classmethod
    def info(cls) -> dict:
        return {
            "id": cls.id,
            "name": cls.name,
            "type": cls.type,
            "blurb": cls.blurb,
            "params": [p.model_dump() for p in cls.param_specs],
        }
