// Browser client for the DRIFT pay-per-call registry. Backed by Next.js API routes
// (/api/listings, /api/call/[id]) — no relay required, works on Vercel. Owners
// list any HTTP/MCP endpoint at one CSPR price; the gateway x402-gates it and
// replays the call to the upstream URL, which is never exposed to buyers.
import { payAndCall, type PaidResponse } from "./x402casper";
import type { CasperAccount } from "./casper";

export type Category = "ai" | "data" | "tool" | "other";

export type Listing = {
  id: string;
  name: string;
  description: string;
  kind: "http" | "mcp";
  hasAuth: boolean;
  category: Category;
  priceCspr: number;
  payTo: CasperAccount;
  owner: CasperAccount;
  method: string;
  calls: number;
  revenueCspr: number;
  createdAt: number;
};

export type NewListing = {
  name: string;
  description: string;
  upstreamUrl: string;
  kind: "http" | "mcp";
  method: string;
  category: Category;
  authHeaderName?: string;
  authHeaderValue?: string;
  priceCspr: number;
  payTo: CasperAccount;
  owner: CasperAccount;
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

// Pay (signed native CSPR transfer) and invoke a listing. Body forwarded verbatim.
export async function callListing(id: string, body: unknown, account: CasperAccount): Promise<PaidResponse> {
  return payAndCall(`/api/call/${id}`, body, account);
}
