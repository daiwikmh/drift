// The pay-per-call listing registry. An owner registers any HTTP/MCP endpoint with
// one USDC price; the gateway (the relay's HTTP server) gates it with x402 and
// replays the call upstream after settlement. The owner's real upstream URL is held
// here, server-side, and NEVER returned to buyers — so they can't bypass payment by
// calling it directly. Persisted to ~/.drift/listings.json (lost on redeploy, like
// the rest of the relay's in-memory state — flagged, not a DB).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { DRIFT_DIR } from "../store.js";

export interface Listing {
  id: string;
  name: string;
  description: string;
  upstreamUrl: string; // server-only; never exposed to buyers
  method: string;
  priceUsdc: number;
  payTo: `0x${string}`;
  owner: `0x${string}`;
  createdAt: number;
  calls: number;
  revenueUsdc: number;
}

// What buyers are allowed to see — everything except the upstream URL.
export type PublicListing = Omit<Listing, "upstreamUrl">;

const file = join(DRIFT_DIR, "listings.json");
let cache: Map<string, Listing> | null = null;

async function load(): Promise<Map<string, Listing>> {
  if (cache) return cache;
  try {
    const arr = JSON.parse(await readFile(file, "utf8")) as Listing[];
    cache = new Map(arr.map((l) => [l.id, l]));
  } catch {
    cache = new Map();
  }
  return cache;
}

async function persist(): Promise<void> {
  if (!cache) return;
  await mkdir(DRIFT_DIR, { recursive: true });
  await writeFile(file, JSON.stringify([...cache.values()], null, 2), { mode: 0o600 });
}

const isAddr = (s: unknown): s is `0x${string}` => typeof s === "string" && /^0x[0-9a-fA-F]{40}$/.test(s);

export function publicView(l: Listing): PublicListing {
  const { upstreamUrl: _omit, ...rest } = l;
  void _omit;
  return rest;
}

export async function listPublic(): Promise<PublicListing[]> {
  const m = await load();
  return [...m.values()].sort((a, b) => b.createdAt - a.createdAt).map(publicView);
}

export async function getListing(id: string): Promise<Listing | undefined> {
  return (await load()).get(id);
}

// Validate + create. Returns an error string on bad input, else the new listing.
export async function createListing(input: unknown): Promise<{ listing?: Listing; error?: string }> {
  const i = input as Partial<Listing>;
  const name = typeof i.name === "string" ? i.name.trim() : "";
  const upstreamUrl = typeof i.upstreamUrl === "string" ? i.upstreamUrl.trim() : "";
  const priceUsdc = Number(i.priceUsdc);
  if (!name) return { error: "name required" };
  if (!/^https?:\/\//.test(upstreamUrl)) return { error: "upstreamUrl must be http(s)" };
  if (!(priceUsdc > 0)) return { error: "priceUsdc must be > 0" };
  if (!isAddr(i.payTo)) return { error: "payTo must be a 0x address" };
  if (!isAddr(i.owner)) return { error: "owner must be a 0x address" };

  const m = await load();
  const listing: Listing = {
    id: randomBytes(6).toString("hex"),
    name,
    description: typeof i.description === "string" ? i.description.trim() : "",
    upstreamUrl,
    method: i.method === "GET" ? "GET" : "POST",
    priceUsdc,
    payTo: i.payTo,
    owner: i.owner,
    createdAt: Date.now(),
    calls: 0,
    revenueUsdc: 0,
  };
  m.set(listing.id, listing);
  await persist();
  return { listing };
}

export async function recordCall(id: string): Promise<void> {
  const m = await load();
  const l = m.get(id);
  if (!l) return;
  l.calls += 1;
  l.revenueUsdc = Math.round((l.revenueUsdc + l.priceUsdc) * 1e6) / 1e6;
  await persist();
}
