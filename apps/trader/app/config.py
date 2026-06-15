"""Runtime configuration for the DRIFT trading engine."""
from __future__ import annotations

import os
from pathlib import Path

# Load the repo-root .env.local into the process env, if python-dotenv is present.
# (The engine reads its own secrets; they are never echoed or written elsewhere.)
try:
    from dotenv import load_dotenv

    for _p in (Path.cwd() / ".env.local", Path(__file__).resolve().parents[3] / ".env.local"):
        if _p.exists():
            load_dotenv(_p, override=False)
except ImportError:
    pass

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

# Optional keys read from the environment for auto-connect at startup. Accepts the
# plain BYBIT_API_KEY/SECRET names or the BYBIT_READ_* variants.
BYBIT_API_KEY: str | None = os.getenv("BYBIT_API_KEY") or os.getenv("BYBIT_READ_API_KEY")
BYBIT_API_SECRET: str | None = os.getenv("BYBIT_API_SECRET") or os.getenv("BYBIT_READ_SECRET")

# CORS origins for the web cockpit (comma-separated). Set ALLOWED_ORIGINS to the
# deployed web URL in production; defaults to local dev.
ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]

# Optional MacroGuard on Mantle (Sepolia by default). When a deployed address and
# the agent key are present the engine logs every bot decision on-chain and checks
# the on-chain macro/halt rules before trading. Inert if unset — bots run normally.
MACROGUARD_ADDRESS: str | None = os.getenv("MACROGUARD_ADDRESS")
ETH_PRIVATE_KEY: str | None = os.getenv("ETH_PRIVATE_KEY")
MANTLE_RPC_URL: str = os.getenv("MANTLE_RPC_URL", "https://rpc.sepolia.mantle.xyz")
MANTLE_CHAIN_ID: int = int(os.getenv("MANTLE_CHAIN_ID", "5003"))
MANTLE_EXPLORER: str = os.getenv("MANTLE_EXPLORER", "https://sepolia.mantlescan.xyz")

# How often the macro-regime engine re-classifies and (if changed) pushes the
# regime on-chain. Regimes shift slowly, so a slow poll keeps gas/noise down.
REGIME_POLL_SECONDS: int = int(os.getenv("REGIME_POLL_SECONDS", "900"))

# Optional LLM analyst (OpenAI-compatible). Advisory only — never drives orders.
# Supports OpenRouter or NVIDIA NIM: whichever key is set wins (OpenRouter first).
# Keys read from env, never hardcoded. Provider/model are resolved in llm.py.
OPENROUTER_API_KEY: str | None = os.getenv("OPENROUTER_API_KEY")
NVIDIA_API_KEY: str | None = os.getenv("NVIDIA_API_KEY") or os.getenv("LLM_API_KEY")
LLM_BASE_URL: str | None = os.getenv("LLM_BASE_URL")  # optional override
LLM_MODEL: str | None = os.getenv("LLM_MODEL")  # optional override

# Optional Telegram: one-way alerts + a two-way control bot. Token from BotFather;
# chat-id is the chat alerts go to (the control bot can bind it on first /start).
TELEGRAM_BOT_TOKEN: str | None = os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID: str | None = os.getenv("TELEGRAM_CHAT_ID")
