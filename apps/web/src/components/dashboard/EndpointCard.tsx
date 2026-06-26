"use client";

import { useState } from "react";
import { btnPrimary, btnGhost, fieldCls, microLabel } from "@/components/dashboard/ui";
import { EXPLORER } from "@/lib/market";
import { callListing, type Listing } from "@/lib/listings";

// A single pay-per-call listing: shows price/usage/type, expands to pay-and-call.
// Shared by the Pay-per-call page (your own listings) and the Marketplace tab.
export function ListingCard({
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
