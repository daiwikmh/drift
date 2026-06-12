"use client";

import { useEffect, useState } from "react";
import { getConnection, setConnection } from "../api";
import type { ConnectionStatus } from "../types";
import { Card, Button, Badge, Row } from "@/features/dashboard/components/primitives";

export function ConnectionPanel() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [testnet, setTestnet] = useState(true);
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
              placeholder="testnet API key"
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
              placeholder="testnet API secret"
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
            Testnet (recommended)
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
            Create testnet keys at{" "}
            <span className="font-mono text-white/60">testnet.bybit.com</span> with
            read + trade scope. Live keys at your own risk.
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
              Connect Bybit testnet keys to deploy live bots. Backtesting works
              without keys.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
