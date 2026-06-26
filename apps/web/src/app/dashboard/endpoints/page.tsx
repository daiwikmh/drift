"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Stat, Section, btnPrimary, btnGhost, fieldCls, microLabel } from "@/components/dashboard/ui";
import { EXPLORER } from "@/lib/market";
import { listListings, registerListing, callListing, type Listing } from "@/lib/listings";

export default function Endpoints() {
  const { account, connect, connecting } = useWallet();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

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

  const mine = account ? listings.filter((l) => l.owner.toLowerCase() === account.toLowerCase()) : [];
  const myRevenue = mine.reduce((s, l) => s + l.revenueUsdc, 0);
  const myCalls = mine.reduce((s, l) => s + l.calls, 0);

  return (
    <div className="mx-auto max-w-4xl px-8 py-9">
      <h1 className="font-display text-2xl tracking-tight">Pay-per-call APIs</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/45">
        List any HTTP API or MCP server with one price. Buyers — humans or agents — pay per call in USDC with a single
        signature: no keys, no gas, no subscription. The gateway settles on Avalanche Fuji and replays the call to your
        endpoint.
      </p>

      {account && mine.length > 0 && (
        <div className="mt-7 grid grid-cols-3 gap-3">
          <Stat label="Your endpoints" value={mine.length} />
          <Stat label="Calls served" value={myCalls} />
          <Stat label="Revenue (USDC)" value={myRevenue.toFixed(2)} tint="#9aa8f0" />
        </div>
      )}

      <ListForm account={account} connect={connect} connecting={connecting} onCreated={refresh} />

      <Section label={`Marketplace · ${listings.length} endpoint${listings.length === 1 ? "" : "s"}`} />
      {loading ? (
        <Card>
          <p className="text-sm text-white/40">Loading endpoints…</p>
        </Card>
      ) : listings.length === 0 ? (
        <Card>
          <p className="text-sm text-white/40">No endpoints listed yet. Be the first — list your API above.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} account={account} connect={connect} connecting={connecting} mine={account?.toLowerCase() === l.owner.toLowerCase()} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListForm({
  account,
  connect,
  connecting,
  onCreated,
}: {
  account: `0x${string}` | null;
  connect: () => void;
  connecting: boolean;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [upstreamUrl, setUpstreamUrl] = useState("");
  const [kind, setKind] = useState<"http" | "mcp">("http");
  const [method, setMethod] = useState("POST");
  const [price, setPrice] = useState("0.01");
  const [description, setDescription] = useState("");
  const [authName, setAuthName] = useState("Authorization");
  const [authValue, setAuthValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!account) return;
    setBusy(true);
    setErr(null);
    setDone(false);
    try {
      await registerListing({
        name: name.trim(),
        description: description.trim(),
        upstreamUrl: upstreamUrl.trim(),
        kind,
        method,
        authHeaderName: authName.trim(),
        authHeaderValue: authValue.trim(),
        priceUsdc: Number(price) || 0.01,
        payTo: account,
        owner: account,
      });
      setName("");
      setUpstreamUrl("");
      setDescription("");
      setAuthValue("");
      setDone(true);
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const valid = name.trim() && /^https?:\/\//.test(upstreamUrl.trim()) && Number(price) > 0;

  return (
    <Card title="List your API" sub="Your wallet receives the USDC. Your upstream URL and auth header stay private — buyers only ever hit the gateway." className="mt-7">
      {!account ? (
        <button onClick={connect} disabled={connecting} className={`${btnPrimary} mt-4`}>
          {connecting ? "Connecting…" : "Connect wallet to list"}
        </button>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={microLabel}>Name</span>
            <input className={`${fieldCls} mt-1.5`} placeholder="my-weather-api" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className={microLabel}>Price (USDC / call)</span>
            <input className={`${fieldCls} mt-1.5`} value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <div className="block sm:col-span-2">
            <span className={microLabel}>Type</span>
            <div className="mt-1.5 flex gap-2">
              <button type="button" onClick={() => setKind("http")} className={kind === "http" ? btnPrimary : btnGhost}>
                HTTP API
              </button>
              <button type="button" onClick={() => setKind("mcp")} className={kind === "mcp" ? btnPrimary : btnGhost}>
                MCP server
              </button>
            </div>
          </div>
          <label className="block sm:col-span-2">
            <span className={microLabel}>
              {kind === "mcp" ? "MCP server URL (Streamable HTTP endpoint)" : "Upstream URL (HTTP API endpoint)"}
            </span>
            <div className="mt-1.5 flex gap-2">
              {kind === "http" && (
                <select className={`${fieldCls} w-28`} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>POST</option>
                  <option>GET</option>
                </select>
              )}
              <input
                className={fieldCls}
                placeholder={kind === "mcp" ? "https://your-server.com/mcp" : "https://api.example.com/v1/endpoint"}
                value={upstreamUrl}
                onChange={(e) => setUpstreamUrl(e.target.value)}
              />
            </div>
          </label>
          <label className="block sm:col-span-2">
            <span className={microLabel}>Description (optional)</span>
            <input className={`${fieldCls} mt-1.5`} placeholder="What does this endpoint do?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className={microLabel}>Upstream auth header (optional — kept private, the gateway injects it for you)</span>
            <div className="mt-1.5 flex gap-2">
              <input className={`${fieldCls} w-44`} placeholder="Authorization" value={authName} onChange={(e) => setAuthName(e.target.value)} />
              <input className={fieldCls} type="password" placeholder="Bearer sk-…  or  your api key" value={authValue} onChange={(e) => setAuthValue(e.target.value)} />
            </div>
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button onClick={submit} disabled={!valid || busy} className={btnPrimary}>
              {busy ? "Listing…" : "List endpoint"}
            </button>
            {done && <span className="text-[13px] text-emerald-400">Listed — live in the marketplace below.</span>}
            {err && <span className="text-[13px] text-[#e84142]">{err}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}

function ListingCard({
  listing,
  account,
  connect,
  connecting,
  mine,
}: {
  listing: Listing;
  account: `0x${string}` | null;
  connect: () => void;
  connecting: boolean;
  mine: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(
    listing.kind === "mcp"
      ? '{\n  "tool": "echo",\n  "arguments": { "text": "hello" }\n}'
      : '{\n  "prompt": "hello"\n}'
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ json: unknown; txHash?: string } | null>(null);

  const run = async () => {
    if (!account) return;
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
      const r = await callListing(listing.id, parsed, account);
      setResult({ json: r.json, txHash: r.txHash });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-medium text-white">{listing.name}</h3>
            {mine && <span className="rounded-md bg-[#9aa8f0]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#9aa8f0]">yours</span>}
          </div>
          {listing.description && <p className="mt-1 text-[13px] text-white/45">{listing.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/35">
            <span className="font-mono text-[#9aa8f0]">${listing.priceUsdc.toFixed(2)} / call</span>
            <span>{listing.calls} calls served</span>
            <span>{listing.revenueUsdc.toFixed(2)} USDC earned</span>
            <span className="font-mono">{listing.kind === "mcp" ? "MCP" : listing.method}</span>
            {listing.hasAuth && <span className="font-mono text-white/30">keyed</span>}
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)} className={btnGhost}>
          {open ? "Close" : "Call"}
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-white/10 pt-4">
          {!account ? (
            <button onClick={connect} disabled={connecting} className={btnPrimary}>
              {connecting ? "Connecting…" : "Connect wallet to call"}
            </button>
          ) : (
            <>
              <span className={microLabel}>
                {listing.kind === "mcp"
                  ? 'MCP call — { "tool", "arguments" }, or { "method": "tools/list" } to discover'
                  : "Request body (JSON, forwarded to the endpoint)"}
              </span>
              <textarea
                className={`${fieldCls} mt-1.5 h-28 font-mono text-[12px]`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="mt-3 flex items-center gap-3">
                <button onClick={run} disabled={busy} className={btnPrimary}>
                  {busy ? "Paying…" : `Pay $${listing.priceUsdc.toFixed(2)} & call`}
                </button>
                <span className="text-[12px] text-white/35">Gasless USDC — one signature, no transaction to send.</span>
              </div>
              {err && <p className="mt-3 text-[13px] text-[#e84142]">{err}</p>}
              {result && (
                <div className="mt-4">
                  <div className={microLabel}>Response</div>
                  <pre className="mt-1.5 max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[12px] text-white/80">
                    {JSON.stringify(result.json, null, 2)}
                  </pre>
                  {result.txHash && (
                    <a
                      href={`${EXPLORER}/tx/${result.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-[12px] text-[#9aa8f0] hover:underline"
                    >
                      Payment settled ↗ {result.txHash.slice(0, 10)}…
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
