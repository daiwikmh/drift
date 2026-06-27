"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Section, btnPrimary, btnGhost, fieldCls, microLabel } from "@/components/dashboard/ui";
import { EXPLORER } from "@/lib/market";
import { listListings, callListing, type Listing } from "@/lib/listings";

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const defaultBody = (l: Listing) =>
  l.kind === "mcp" ? '{\n  "tool": "echo",\n  "arguments": { "text": "hello" }\n}' : '{\n  "prompt": "hello"\n}';

export default function Playground() {
  const { account, connect, connecting } = useWallet();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [body, setBody] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: number; json: unknown; txHash?: string } | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const refresh = useCallback(() => {
    listListings()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  // Default the selection to the first endpoint once loaded.
  useEffect(() => {
    if (!selectedId && listings.length) setSelectedId(listings[0].id);
  }, [listings, selectedId]);

  // Reset the body template + last result only when the chosen endpoint changes.
  useEffect(() => {
    const l = listings.find((x) => x.id === selectedId);
    if (l) setBody(defaultBody(l));
    setResult(null);
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selected = listings.find((l) => l.id === selectedId) ?? null;
  const endpointUrl = selected && origin ? `${origin}/api/call/${selected.id}` : "";

  const curlBody = (() => {
    try {
      return JSON.stringify(JSON.parse(body));
    } catch {
      return body.replace(/\n/g, " ");
    }
  })();
  const curl = `curl -X POST ${endpointUrl} \\\n  -H 'Content-Type: application/json' \\\n  -d '${curlBody}'`;

  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };

  const run = async () => {
    if (!account || !selected) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    let parsed: unknown;
    try {
      parsed = body.trim() ? JSON.parse(body) : {};
    } catch {
      setErr("Body must be valid JSON");
      setBusy(false);
      return;
    }
    try {
      const r = await callListing(selected.id, parsed, account);
      setResult({ status: r.status, json: r.json, txHash: r.txHash });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mx-auto max-w-3xl px-8 ${compact ? "py-6" : "py-9"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Playground</h1>
          {!compact && (
            <p className="mt-1 max-w-2xl text-sm text-white/45">
              Send a real pay-per-call request to any listed endpoint. Pick one, edit the body, and pay in one gasless
              USDC signature — you&rsquo;ll see the x402 terms, the on-chain settlement, and the response.
            </p>
          )}
        </div>
        <button onClick={() => setCompact((c) => !c)} className={`${btnGhost} shrink-0`}>
          {compact ? "Expand" : "Compact"}
        </button>
      </div>

      {loading ? (
        <Card className={compact ? "mt-4" : "mt-8"}>
          <p className="text-sm text-white/40">Loading endpoints…</p>
        </Card>
      ) : listings.length === 0 ? (
        <Card className={compact ? "mt-4" : "mt-8"}>
          <p className="text-sm text-white/40">
            No endpoints listed yet.{" "}
            <Link href="/dashboard" className="text-[#9aa8f0] hover:underline">
              List one
            </Link>{" "}
            to try it here.
          </p>
        </Card>
      ) : (
        <>
          <Card className={compact ? "mt-4" : "mt-8"}>
            {/* Every listed endpoint as a chip — click any to test it */}
            <div>
              <span className={microLabel}>
                Endpoint{listings.length > 1 ? ` · ${listings.length} listed` : ""}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {listings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedId(l.id)}
                    className={`rounded-full border px-3 py-1.5 text-left text-[12.5px] transition ${
                      selectedId === l.id
                        ? "border-[#9aa8f0] bg-[#9aa8f0]/10 text-white"
                        : "border-white/10 text-white/55 hover:border-white/30"
                    }`}
                  >
                    {l.name}
                    <span className="text-white/35">
                      {" "}
                      · ${l.priceUsdc.toFixed(2)} · {l.kind === "mcp" ? "MCP" : l.method}
                      {l.hasAuth ? " · keyed" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selected && !compact && (
              <>
                {/* The endpoint a buyer actually calls — the x402 gateway, not the upstream URL */}
                <div className="mt-4">
                  <span className={microLabel}>Gateway endpoint (this is what gets charged)</span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white/80">
                      POST {endpointUrl || "…"}
                    </code>
                    <button onClick={() => copy("url", endpointUrl)} className={btnGhost}>
                      {copied === "url" ? "copied" : "copy"}
                    </button>
                  </div>
                </div>

                {/* x402 terms, derived from the listing */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[12px] text-white/50">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/30">402 payment terms</span>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono">
                    <span>scheme exact (x402)</span>
                    <span>network avalanche-fuji</span>
                    <span className="text-[#9aa8f0]">
                      ${selected.priceUsdc.toFixed(2)} USDC ({Math.round(selected.priceUsdc * 1e6)} units)
                    </span>
                    <span>asset USDC 0x5425…Bc65</span>
                    <span>payTo {short(selected.payTo)}</span>
                  </div>
                </div>
              </>
            )}

            <label className="mt-4 block">
              <span className={microLabel}>
                {selected?.kind === "mcp"
                  ? 'MCP call — { "tool", "arguments" }, or { "method": "tools/list" }'
                  : "Request body (JSON, forwarded to the endpoint)"}
              </span>
              <textarea
                className={`${fieldCls} mt-1.5 ${compact ? "h-20" : "h-32"} font-mono text-[12px]`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>

            <div className="mt-3 flex items-center gap-3">
              {account ? (
                <button onClick={run} disabled={busy || !selected} className={btnPrimary}>
                  {busy ? "Paying…" : `Pay $${selected?.priceUsdc.toFixed(2) ?? "0.00"} & call`}
                </button>
              ) : (
                <button onClick={connect} disabled={connecting} className={btnPrimary}>
                  {connecting ? "Connecting…" : "Connect wallet to call"}
                </button>
              )}
              {!compact && (
                <span className="text-[12px] text-white/35">Gasless USDC — one signature, no transaction to send.</span>
              )}
            </div>
            {err && <p className="mt-3 text-[13px] text-[#e84142]">⚠ {err}</p>}

            {result && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="mb-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-white/30">
                  Response <span className="font-mono normal-case tracking-normal text-white/40">HTTP {result.status}</span>
                  {result.txHash && (
                    <a
                      href={`${EXPLORER}/tx/${result.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto font-mono normal-case tracking-normal text-emerald-400 hover:underline"
                    >
                      settled · {short(result.txHash)} ↗
                    </a>
                  )}
                </div>
                <pre
                  className={`overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[12px] text-white/80 ${
                    compact ? "max-h-44" : "max-h-72"
                  }`}
                >
                  {JSON.stringify(result.json, null, 2)}
                </pre>
              </div>
            )}
          </Card>

          {/* Call it from anywhere (agent / external) */}
          {selected && !compact && (
            <>
              <Section label="Call it from anywhere" />
              <Card>
                <p className="text-[12.5px] text-white/45">
                  Any x402 client hits the same gateway endpoint. The first request returns the 402 challenge; an agent
                  signs the EIP-3009 authorization and replays with an <code className="text-white/70">X-PAYMENT</code> header.
                </p>
                <div className="mt-3 flex items-start gap-2">
                  <pre className="flex-1 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[12px] text-white/80">
                    {curl}
                  </pre>
                  <button onClick={() => copy("curl", curl)} className={btnGhost}>
                    {copied === "curl" ? "copied" : "copy"}
                  </button>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
