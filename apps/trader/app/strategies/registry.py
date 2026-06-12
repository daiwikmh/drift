"""Strategy registry — single source of truth for available strategies."""
from __future__ import annotations

from .base import Strategy
from .bollinger import BollingerStrategy
from .dual_thrust import DualThrustStrategy
from .macd import MacdStrategy
from .rsi import RsiStrategy

_STRATEGIES: dict[str, type[Strategy]] = {
    s.id: s
    for s in (MacdStrategy, RsiStrategy, BollingerStrategy, DualThrustStrategy)
}


def all_strategies() -> list[type[Strategy]]:
    return list(_STRATEGIES.values())


def get_strategy(strategy_id: str, params: dict[str, float] | None = None) -> Strategy:
    if strategy_id not in _STRATEGIES:
        raise ValueError(f"unknown strategy: {strategy_id}")
    return _STRATEGIES[strategy_id](params)
