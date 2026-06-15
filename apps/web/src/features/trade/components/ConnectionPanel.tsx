"use client";

import { useEffect, useState } from "react";
import {
  connectTelegram,
  getConnection,
  getTelegram,
  setConnection,
  testTelegram,
} from "../api";
import type { ConnectionStatus, TelegramStatus } from "../types";
import { Card, Button, Badge, Row } from "@/features/dashboard/components/primitives";

export function ConnectionPanel() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [testnet, setTestnet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getConnection(ac.signal).then(setStatus).catch(() => setStatus(null));
    return () => ac.abort();
  }, []);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await setConnection({ api_key: apiKey, api_secret: apiSecret, testnet });
      setStatus(s);
      setApiSecret("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Bybit connection" subtitle="Keys are held in memory only, never written to disk">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/45">
              API key
            </span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key"
              className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-[13px] text-white outline-none focus:border-[#9aa8f0]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/45">
              API secret
            </span>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API secret"
              className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-[13px] text-white outline-none focus:border-[#9aa8f0]"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-white/70">
            <input
              type="checkbox"
              checked={testnet}
              onChange={(e) => setTestnet(e.target.checked)}
              className="accent-[#9aa8f0]"
            />
            Testnet
          </label>
          {error && <p className="font-mono text-[11px] text-rose-300">{error}</p>}
          <Button
            variant="primary"
            className="w-full"
            onClick={connect}
            disabled={busy || !apiKey || !apiSecret}
          >
            {busy ? "Connecting…" : "Connect"}
          </Button>
          <p className="text-xs leading-relaxed text-white/45">
            Read-scope keys unlock markets and portfolio. Trade-scope keys are
            required to deploy bots. Keys are held in memory only.
          </p>
        </div>
      </Card>

      <Card title="Status">
        {status?.connected ? (
          <div className="space-y-1">
            <div className="mb-2">
              <Badge tone="green" dot>
                Connected · {status.testnet ? "testnet" : "live"}
              </Badge>
            </div>
            <Row label="Wallet balance" value={`${(status.balance ?? 0).toFixed(2)} USDT`} />
          </div>
        ) : (
          <div className="space-y-2 py-2">
            <Badge tone="amber" dot>
              Not connected
            </Badge>
            <p className="text-sm text-white/50">
              Connect Bybit API keys to deploy bots. Backtesting and markets work without keys.
            </p>
          </div>
        )}
      </Card>

      <TelegramCard />
    </div>
  );
}

function TelegramCard() {
  const [tg, setTg] = useState<TelegramStatus | null>(null);
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getTelegram(ac.signal).then(setTg).catch(() => setTg(null));
    return () => ac.abort();
  }, []);

  const connect = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const s = await connectTelegram({ token, chat_id: chatId || undefined });
      setTg(s);
      setToken("");
      setNote(
        s.enabled
          ? "Connected — alerts will arrive in your chat."
          : `Bot @${s.username} verified. Now message it /start to bind your chat.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setError(null);
    setNote(null);
    try {
      await testTelegram();
      setNote("Test alert sent.");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Card title="Telegram" subtitle="Alerts + a two-way control bot (/status, /deploy, /kill)">
      <div className="space-y-3">
        <div className="mb-1">
          {tg?.enabled ? (
            <Badge tone="green" dot>
              Connected{tg.username ? ` · @${tg.username}` : ""}
            </Badge>
          ) : tg?.configured ? (
            <Badge tone="amber" dot>
              Token set — message the bot /start
            </Badge>
          ) : (
            <Badge tone="zinc" dot>
              Not connected
            </Badge>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/45">
            Bot token (from @BotFather)
          </span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456:ABC-..."
            className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-[13px] text-white outline-none focus:border-[#9aa8f0]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/45">
            Chat ID (optional — or /start the bot)
          </span>
          <input
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="e.g. 123456789"
            className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-[13px] text-white outline-none focus:border-[#9aa8f0]"
          />
        </label>
        {note && <p className="text-[11px] text-emerald-300">{note}</p>}
        {error && <p className="font-mono text-[11px] text-rose-300">{error}</p>}
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={connect} disabled={busy || !token}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
          {tg?.enabled && (
            <Button variant="outline" onClick={test}>
              Send test
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
