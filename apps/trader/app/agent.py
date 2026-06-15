"""Conversational agent: natural language → real tool calls.

Wraps the configured LLM with a tool schema over DRIFT's read/compute capabilities
(markets, regime, backtest, on-chain status). The model decides which tools to
call; the caller supplies an `execute(name, args) -> str` that runs them against
real data and feeds results back until the model answers.

Deploying a bot places REAL orders, so it is NOT a tool — the agent is told to
hand the user the exact `bot …` command to run instead (human stays in control).
"""
from __future__ import annotations

import json
from typing import Callable

from . import llm

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_markets",
            "description": "Live price and 24h change for the main tracked symbols (BTC, ETH, SOL, …).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market",
            "description": "Live price, 24h change and range for one symbol.",
            "parameters": {
                "type": "object",
                "properties": {"symbol": {"type": "string", "description": "e.g. BTC or BTCUSDT"}},
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_regime",
            "description": "Current macro risk regime (risk-off/neutral/risk-on) with vol z-score and trend.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_backtest",
            "description": "Backtest one strategy on a symbol; returns return, sharpe, win-rate, max drawdown, trades.",
            "parameters": {
                "type": "object",
                "properties": {
                    "strategy": {"type": "string", "description": "macd, rsi, bollinger, or dualthrust"},
                    "symbol": {"type": "string"},
                    "timeframe": {"type": "string", "description": "e.g. 1h, 4h"},
                },
                "required": ["strategy", "symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_chain",
            "description": "On-chain MacroGuard status (address, network, the regime currently enforced).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

SYSTEM = (
    "You are DRIFT, an autonomous crypto trading agent running in a terminal. You help the "
    "user understand markets and your strategies using REAL data from your tools — always call "
    "a tool for live numbers, never invent them. Be concise and conversational (a few sentences, "
    "no markdown headings). You run deterministic quant bots (macd, rsi, bollinger, dualthrust) "
    "on Bybit, guarded by an on-chain MacroGuard that enforces risk limits and a macro-regime "
    "engine. You do NOT place orders yourself: to start a bot, give the user the exact command "
    "to run — `bot <strategy> <symbol> [timeframe] [qty] [maxDrawdown]` (e.g. `bot rsi eth 1h "
    "0.001 0.2`) — so they stay in control of real money. If greeted or asked who you are, briefly "
    "say what you can do (scan markets, analyze a coin, check the regime, backtest, suggest a bot)."
)


def _assistant_dict(msg) -> dict:
    d: dict = {"role": "assistant", "content": msg.content or ""}
    if msg.tool_calls:
        d["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]
    return d


def run(user_text: str, history: list[dict], execute: Callable[[str, dict], str], max_steps: int = 5) -> str:
    """One conversational turn. `history` carries user/assistant memory across turns."""
    client = llm._get_client()
    history.append({"role": "user", "content": user_text})
    messages = [{"role": "system", "content": SYSTEM}] + history[-20:]

    for _ in range(max_steps):
        resp = client.chat.completions.create(
            model=llm.model(),
            messages=messages,
            tools=TOOLS,
            temperature=0.4,
            max_tokens=900,
        )
        msg = resp.choices[0].message
        messages.append(_assistant_dict(msg))
        if not msg.tool_calls:
            answer = msg.content or ""
            history.append({"role": "assistant", "content": answer})
            return answer
        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except Exception:
                args = {}
            result = execute(tc.function.name, args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

    answer = "I got a bit tangled running tools — try rephrasing?"
    history.append({"role": "assistant", "content": answer})
    return answer
