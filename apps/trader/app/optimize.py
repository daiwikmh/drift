"""Auto-Research: parameter sweep with an honest train/test split.

For each strategy we sweep a grid of parameters, pick the best on the *training*
slice, then report its performance on a held-out *test* slice it never saw. A
config that looks great in-sample but collapses out-of-sample is flagged
``overfit`` — the point of the exercise (cf. *Profit Mirage*).
"""
from __future__ import annotations

import itertools
import math

import numpy as np
import pandas as pd

from .config import BARS_PER_YEAR
from .models import (
    EquityPoint,
    OptimizeResponse,
    OptimizeResult,
    SliceMetrics,
)
from .strategies.base import Strategy
from .strategies.registry import all_strategies

GRID_STEPS = 5          # values sampled per parameter
MAX_COMBOS = 240        # safety cap per strategy
EQUITY_POINTS = 160     # downsample target for the preview curve


def _grid_values(spec) -> list[float]:
    lo, hi, step = spec.min, spec.max, spec.step
    raw = np.linspace(lo, hi, GRID_STEPS)
    out: list[float] = []
    for v in raw:
        snapped = round(round(v / step) * step, 6)
        snapped = max(lo, min(hi, snapped))
        if step >= 1:
            snapped = float(int(round(snapped)))
        if snapped not in out:
            out.append(snapped)
    return out


def _param_grid(strategy_cls: type[Strategy]) -> list[dict[str, float]]:
    keys = [p.key for p in strategy_cls.param_specs]
    values = [_grid_values(p) for p in strategy_cls.param_specs]
    combos: list[dict[str, float]] = []
    for combo in itertools.product(*values):
        params = dict(zip(keys, combo))
        # MACD-style: a fast average must be shorter than the slow one.
        if "fast" in params and "slow" in params and params["fast"] >= params["slow"]:
            continue
        combos.append(params)
    return combos[:MAX_COMBOS]


def _slice_metrics(strat_ret: pd.Series, positions: pd.Series, timeframe: str) -> SliceMetrics:
    if len(strat_ret) < 2:
        return SliceMetrics(total_return=0, sharpe=0, max_drawdown=0, num_trades=0)
    equity = (1.0 + strat_ret).cumprod()
    total_return = float(equity.iloc[-1] - 1.0)
    std = float(strat_ret.std())
    bpy = BARS_PER_YEAR.get(timeframe, 8_760)
    sharpe = float(strat_ret.mean() / std * math.sqrt(bpy)) if std > 0 else 0.0
    max_dd = float((equity / equity.cummax() - 1.0).min())
    # round-trip count: changes away from a non-flat position
    trades = 0
    prev = 0.0
    for p in positions:
        if p != prev:
            if prev != 0:
                trades += 1
            prev = p
    return SliceMetrics(
        total_return=round(total_return, 6),
        sharpe=round(sharpe, 4),
        max_drawdown=round(max_dd, 6),
        num_trades=trades,
    )


def _verdict(is_sharpe: float, oos_sharpe: float) -> str:
    # Robust = the edge shows up in *both* slices. Overfit = strong in-sample,
    # collapses out-of-sample. Everything else (incl. lucky OOS-only) is weak.
    if is_sharpe >= 0.5 and oos_sharpe >= 0.5:
        return "robust"
    if is_sharpe >= 0.5 and oos_sharpe < 0.4 * is_sharpe:
        return "overfit"
    return "weak"


_VERDICT_RANK = {"robust": 0, "overfit": 1, "weak": 2}


def _downsample_equity(df: pd.DataFrame, equity: pd.Series, drawdown: pd.Series, split: int):
    n = len(df)
    stride = max(1, n // EQUITY_POINTS)
    idxs = list(range(0, n, stride))
    if idxs[-1] != n - 1:
        idxs.append(n - 1)
    points = [
        EquityPoint(
            time=int(df["time"].iloc[i]),
            equity=round(float(equity.iloc[i]), 6),
            drawdown=round(float(drawdown.iloc[i]), 6),
        )
        for i in idxs
    ]
    # where the test slice begins, in downsampled coordinates
    split_ds = next((k for k, i in enumerate(idxs) if i >= split), len(idxs) - 1)
    return points, split_ds


def optimize(df: pd.DataFrame, symbol: str, timeframe: str, train_frac: float) -> OptimizeResponse:
    n = len(df)
    split = int(n * train_frac)
    bar_ret = df["close"].pct_change().fillna(0.0)

    results: list[OptimizeResult] = []
    for cls in all_strategies():
        candidates = []  # (params, positions, train_metrics)
        for params in _param_grid(cls):
            positions = cls(params).positions(df).astype(float)
            strat_ret = positions.shift(1).fillna(0.0) * bar_ret
            train_m = _slice_metrics(strat_ret.iloc[:split], positions.iloc[:split], timeframe)
            candidates.append((params, positions, train_m))
        if not candidates:
            continue

        # Prefer configs that actually trade in-sample; a no-trade config has
        # Sharpe 0 and would otherwise win over every losing one.
        trading = [c for c in candidates if c[2].num_trades >= 2]
        pool = trading or candidates
        params, positions, train_m = max(pool, key=lambda c: c[2].sharpe)
        strat_ret = positions.shift(1).fillna(0.0) * bar_ret
        test_m = _slice_metrics(strat_ret.iloc[split:], positions.iloc[split:], timeframe)

        equity = (1.0 + strat_ret).cumprod()
        drawdown = equity / equity.cummax() - 1.0
        points, split_ds = _downsample_equity(df, equity, drawdown, split)

        results.append(
            OptimizeResult(
                strategy=cls.id,
                name=cls.name,
                params=params,
                in_sample=train_m,
                out_of_sample=test_m,
                verdict=_verdict(train_m.sharpe, test_m.sharpe),
                equity=points,
                split_index=split_ds,
            )
        )

    # robust strategies first, then by out-of-sample Sharpe within each tier
    results.sort(key=lambda r: (_VERDICT_RANK[r.verdict], -r.out_of_sample.sharpe))
    return OptimizeResponse(symbol=symbol, timeframe=timeframe, train_frac=train_frac, results=results)
