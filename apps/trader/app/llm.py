"""Optional LLM analyst (OpenAI-compatible — OpenRouter or NVIDIA NIM).

Given a symbol's live macro regime and market snapshot, asks a reasoning model
to write a short, grounded trade rationale. **Advisory only** — it never places
orders, never overrides the deterministic regime engine or the on-chain guard.

Either an OpenRouter (`sk-or-…`) or NVIDIA (`nvapi-…`) key works; the provider is
picked from env at import, or set at runtime via `configure()` (the CLI prompts
for one at startup). Keys live in memory only and are never logged.
"""
from __future__ import annotations

from typing import Iterator, Optional

from .config import LLM_BASE_URL, LLM_MODEL, NVIDIA_API_KEY, OPENROUTER_API_KEY
from .regime import Regime

PROVIDERS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "model": "anthropic/claude-3.5-sonnet",
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "model": "nvidia/nemotron-3-super-120b-a12b",
    },
}

_state: dict = {"key": None, "provider": None, "base_url": None, "model": None}
_client = None


def detect_provider(key: str) -> str:
    """NVIDIA keys are `nvapi-…`; treat everything else (incl. `sk-or-…`) as OpenRouter."""
    return "nvidia" if key.startswith("nvapi-") else "openrouter"


def configure(
    key: str,
    provider: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
) -> None:
    """Point the analyst at a key (provider auto-detected unless given)."""
    global _client
    key = key.strip()
    provider = provider or detect_provider(key)
    p = PROVIDERS.get(provider, PROVIDERS["openrouter"])
    _state.update(
        key=key,
        provider=provider,
        base_url=base_url or p["base_url"],
        model=model or p["model"],
    )
    _client = None  # rebuilt lazily against the new key


def is_enabled() -> bool:
    return bool(_state["key"])


def provider() -> Optional[str]:
    return _state["provider"]


def model() -> Optional[str]:
    return _state["model"]


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI

        _client = OpenAI(api_key=_state["key"], base_url=_state["base_url"])
    return _client


SYSTEM = (
    "You are DRIFT's macro analyst. You are given REAL market data and a risk "
    "regime that was computed deterministically from volatility and trend. In "
    "3-4 sentences, explain the trading stance the regime implies and the single "
    "biggest risk to it. Be concise and specific. Use only the numbers provided "
    "— never invent prices, levels, or statistics."
)


def _user_prompt(symbol: str, reg: Regime, change24h: Optional[float]) -> str:
    chg = f"{change24h:+.2%}" if change24h is not None else "n/a"
    return (
        f"Symbol: {symbol}\n"
        f"Last price: {reg.price:,.2f}\n"
        f"24h change: {chg}\n"
        f"Computed regime: {reg.label}\n"
        f"Volatility z-score: {reg.vol_z:+.2f} (>1 = turbulent)\n"
        f"Trend (48-bar EWMA): {reg.trend:+.4f}\n\n"
        f"Given this, what stance should a risk-aware bot take and what is the key risk?"
    )


def _messages(symbol: str, reg: Regime, change24h: Optional[float]) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": _user_prompt(symbol, reg, change24h)},
    ]


def analyze(symbol: str, reg: Regime, change24h: Optional[float] = None) -> str:
    """One-shot analysis (non-streaming) for the HTTP API."""
    if not is_enabled():
        raise RuntimeError("LLM analyst not configured")
    resp = _get_client().chat.completions.create(
        model=_state["model"],
        messages=_messages(symbol, reg, change24h),
        temperature=0.6,
        top_p=0.95,
        max_tokens=1024,
    )
    return resp.choices[0].message.content or ""


def stream(symbol: str, reg: Regime, change24h: Optional[float] = None) -> Iterator[tuple[str, str]]:
    """Stream the analysis for the terminal. Yields ("reasoning"|"content", text)."""
    if not is_enabled():
        raise RuntimeError("LLM analyst not configured")
    # The thinking toggle is NVIDIA-specific; other providers surface reasoning
    # via a `reasoning` delta field (if at all), which we read below.
    extra = {"chat_template_kwargs": {"enable_thinking": True}} if _state["provider"] == "nvidia" else {}
    completion = _get_client().chat.completions.create(
        model=_state["model"],
        messages=_messages(symbol, reg, change24h),
        temperature=0.6,
        top_p=0.95,
        max_tokens=2048,
        extra_body=extra,
        stream=True,
    )
    for chunk in completion:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        reasoning = getattr(delta, "reasoning_content", None) or getattr(delta, "reasoning", None)
        if reasoning:
            yield "reasoning", reasoning
        if delta.content:
            yield "content", delta.content


# Resolve a provider from the environment at import (OpenRouter wins if both set).
if OPENROUTER_API_KEY:
    configure(OPENROUTER_API_KEY, "openrouter", LLM_BASE_URL, LLM_MODEL)
elif NVIDIA_API_KEY:
    configure(NVIDIA_API_KEY, "nvidia", LLM_BASE_URL, LLM_MODEL)
