"""Telegram connection: one-way alerts + the engine's two-way control bot.

`send()` pushes events (fills, drawdown stops, regime flips, on-chain tx) to a
chat; the engine's control loop long-polls `get_updates()` and answers commands
like /status, /deploy, /kill, /analyze. Inert unless a bot token is set. Token
and chat-id live in memory only and are never written to disk.
"""
from __future__ import annotations

from typing import Optional

import requests

from .config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

_API = "https://api.telegram.org/bot{token}/{method}"


class Telegram:
    def __init__(self) -> None:
        self.token: Optional[str] = TELEGRAM_BOT_TOKEN
        self.chat_id: Optional[str] = TELEGRAM_CHAT_ID
        self.username: Optional[str] = None

    def is_enabled(self) -> bool:
        """True when we can both send and target a chat."""
        return bool(self.token and self.chat_id)

    def configure(self, token: str, chat_id: Optional[str] = None) -> str:
        """Verify the token via getMe and store it. Returns the bot username."""
        token = token.strip()
        r = requests.get(_API.format(token=token, method="getMe"), timeout=10).json()
        if not r.get("ok"):
            raise RuntimeError(r.get("description", "invalid bot token"))
        self.token = token
        self.username = r["result"].get("username")
        if chat_id:
            self.chat_id = str(chat_id).strip()
        return self.username or "bot"

    def info(self) -> dict:
        return {
            "enabled": self.is_enabled(),
            "configured": bool(self.token),
            "chat_id": self.chat_id,
            "username": self.username,
        }

    def send_to(self, chat_id: str, text: str) -> bool:
        if not self.token or not chat_id:
            return False
        try:
            r = requests.post(
                _API.format(token=self.token, method="sendMessage"),
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                    "disable_web_page_preview": True,
                },
                timeout=10,
            )
            return r.ok
        except Exception:
            return False

    def send(self, text: str) -> bool:
        """Push an alert to the configured chat (best-effort, no-op if unset)."""
        if not self.chat_id:
            return False
        return self.send_to(self.chat_id, text)

    def get_updates(self, offset: Optional[int] = None, timeout: int = 25) -> list[dict]:
        if not self.token:
            return []
        params: dict = {"timeout": timeout}
        if offset is not None:
            params["offset"] = offset
        try:
            r = requests.get(
                _API.format(token=self.token, method="getUpdates"),
                params=params,
                timeout=timeout + 10,
            ).json()
        except Exception:
            return []
        return r.get("result", []) if r.get("ok") else []


tg = Telegram()
