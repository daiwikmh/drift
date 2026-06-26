// Browser client for the DRIFT pay-per-call registry. Backed by Next.js API routes
// (/api/listings, /api/call/[id]) — no relay required, works on Vercel. Owners
// list any HTTP/MCP endpoint at one USDC price; the gateway x402-gates it and
// replays the call to the upstream URL, which is never exposed to buyers.
import { payAndCall, type PaidResponse } from "./x402usdc";

export type Listing = {
  id: string;
  name: string;
  description: string;
  kind: "http" | "mcp";
  hasAuth: boolean;
  priceUsdc: number;
  payTo: `0x${string}`;
  owner: `0x${string}`;
  method: string;
  calls: number;
  revenueUsdc: number;
  createdAt: number;
};

export type NewListing = {
  name: string;
  description: string;
  upstreamUrl: string;
  kind: "http" | "mcp";
  method: string;
  authHeaderName?: string;
  authHeaderValue?: string;
  priceUsdc: number;
  payTo: `0x${string}`;
  owner: `0x${string}`;
};

export async function listListings(): Promise<Listing[]> {
  const r = await fetch("/api/listings");
  if (!r.ok) throw new Error(`listings API returned ${r.status}`);
  const j = (await r.json()) as { listings?: Listing[] };
  return j.listings ?? [];
}

export async function registerListing(input: NewListing): Promise<Listing> {
  const r = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `register failed ${r.status}`);
  return (j as { listing: Listing }).listing;
}

// Pay (gasless USDC, one signature) and invoke a listing. Body forwarded verbatim.
export async function callListing(id: string, body: unknown, account: `0x${string}`): Promise<PaidResponse> {
  return payAndCall(`/api/call/${id}`, body, account);
}
