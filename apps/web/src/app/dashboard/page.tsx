"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Stat, Section, btnPrimary, btnGhost, fieldCls, microLabel } from "@/components/dashboard/ui";
import { ListingCard } from "@/components/dashboard/EndpointCard";
import { listListings, registerListing, type Listing } from "@/lib/listings";

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
        endpoint. Browse and buy everyone&rsquo;s endpoints in the{" "}
        <Link href="/dashboard/marketplace" className="text-[#9aa8f0] hover:underline">
          Marketplace
        </Link>
        .
      </p>

      {account && mine.length > 0 && (
        <div className="mt-7 grid grid-cols-3 gap-3">
          <Stat label="Your endpoints" value={mine.length} />
          <Stat label="Calls served" value={myCalls} />
          <Stat label="Revenue (USDC)" value={myRevenue.toFixed(2)} tint="#9aa8f0" />
        </div>
      )}

      <ListForm account={account} connect={connect} connecting={connecting} onCreated={refresh} />

      <Section label="Your endpoints" />
      {!account ? (
        <Card>
          <p className="text-sm text-white/40">Connect your wallet to see the endpoints you&rsquo;ve listed.</p>
        </Card>
      ) : loading ? (
        <Card>
          <p className="text-sm text-white/40">Loading…</p>
        </Card>
      ) : mine.length === 0 ? (
        <Card>
          <p className="text-sm text-white/40">You haven&rsquo;t listed anything yet — list your API above.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {mine.map((l) => (
            <ListingCard key={l.id} listing={l} account={account} connect={connect} connecting={connecting} mine />
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
            {done && <span className="text-[13px] text-emerald-400">Listed — live in the Marketplace.</span>}
            {err && <span className="text-[13px] text-[#e84142]">{err}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
