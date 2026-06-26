// Listing registry for the pay-per-call gateway. Durable when Upstash Redis is
// configured (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) — survives cold
// starts and works across Vercel serverless instances. Falls back to an in-memory
// Map when those env vars are absent, so local dev / un-provisioned deploys still
// run (state then lives only in the process, lost on restart). Same async
// interface either way — the API routes don't care which backend is active.
import { randomBytes } from "crypto";
import { Redis } from "@upstash/redis";

export type Listing = {
  id: string;
  name: string;
  description: string;
  upstreamUrl: string; // server-only — never sent to the client
  authHeaderName?: string; // server-only — owner's key to reach the upstream
  authHeaderValue?: string; // server-only — the secret value, injected by the gateway
  kind: "http" | "mcp";
  method: string;
  priceUsdc: number;
  payTo: `0x${string}`;
  owner: `0x${string}`;
  createdAt: number;
  calls: number;
  revenueUsdc: number;
};

export type PublicListing = Omit<Listing, "upstreamUrl" | "authHeaderName" | "authHeaderValue"> & {
  hasAuth: boolean;
};

const LKEY = "drift:listings"; // Redis hash: id -> Listing
const NKEY = "drift:nonces"; // Redis set: used EIP-3009 nonces

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// In-memory fallback, pinned on globalThis so it survives Next.js dev HMR.
const g = globalThis as typeof globalThis & {
  _driftListings?: Map<string, Listing>;
  _driftNonces?: Set<string>;
};
if (!g._driftListings) g._driftListings = new Map();
if (!g._driftNonces) g._driftNonces = new Set();
const memStore = g._driftListings;
const memNonces = g._driftNonces;

export function publicView(l: Listing): PublicListing {
  const { upstreamUrl: _u, authHeaderName: _n, authHeaderValue: _v, ...rest } = l;
  void _u;
  void _n;
  void _v;
  return { ...rest, hasAuth: !!l.authHeaderValue };
}

export async function listPublic(): Promise<PublicListing[]> {
  const all = redis
    ? Object.values((await redis.hgetall<Record<string, Listing>>(LKEY)) ?? {})
    : [...memStore.values()];
  return all.sort((a, b) => b.createdAt - a.createdAt).map(publicView);
}

export async function getListing(id: string): Promise<Listing | undefined> {
  if (redis) return (await redis.hget<Listing>(LKEY, id)) ?? undefined;
  return memStore.get(id);
}

export async function createListing(input: unknown): Promise<{ listing?: Listing; error?: string }> {
  const i = input as Partial<Listing>;
  const name = typeof i.name === "string" ? i.name.trim() : "";
  const upstreamUrl = typeof i.upstreamUrl === "string" ? i.upstreamUrl.trim() : "";
  const priceUsdc = Number(i.priceUsdc);
  const isAddr = (s: unknown): s is `0x${string}` =>
    typeof s === "string" && /^0x[0-9a-fA-F]{40}$/.test(s);

  if (!name) return { error: "name required" };
  if (!/^https?:\/\//.test(upstreamUrl)) return { error: "upstreamUrl must be http(s)" };
  if (!(priceUsdc > 0)) return { error: "priceUsdc must be > 0" };
  if (!isAddr(i.payTo)) return { error: "payTo must be a 0x address" };
  if (!isAddr(i.owner)) return { error: "owner must be a 0x address" };

  const kind = i.kind === "mcp" ? "mcp" : "http";
  const authValue = typeof i.authHeaderValue === "string" ? i.authHeaderValue.trim() : "";
  const authName =
    typeof i.authHeaderName === "string" && i.authHeaderName.trim() ? i.authHeaderName.trim() : "Authorization";

  const listing: Listing = {
    id: randomBytes(6).toString("hex"),
    name,
    description: typeof i.description === "string" ? i.description.trim() : "",
    upstreamUrl,
    authHeaderName: authValue ? authName : undefined,
    authHeaderValue: authValue || undefined,
    kind,
    method: kind === "mcp" ? "POST" : i.method === "GET" ? "GET" : "POST",
    priceUsdc,
    payTo: i.payTo,
    owner: i.owner,
    createdAt: Date.now(),
    calls: 0,
    revenueUsdc: 0,
  };
  if (redis) await redis.hset(LKEY, { [listing.id]: listing });
  else memStore.set(listing.id, listing);
  return { listing };
}

export async function isNonceUsed(nonce: string): Promise<boolean> {
  const n = nonce.toLowerCase();
  if (redis) return (await redis.sismember(NKEY, n)) === 1;
  return memNonces.has(n);
}

export async function markNonce(nonce: string): Promise<void> {
  const n = nonce.toLowerCase();
  if (redis) await redis.sadd(NKEY, n);
  else memNonces.add(n);
}

export async function recordCall(id: string): Promise<void> {
  if (redis) {
    const l = await redis.hget<Listing>(LKEY, id);
    if (!l) return;
    l.calls += 1;
    l.revenueUsdc = Math.round((l.revenueUsdc + l.priceUsdc) * 1e6) / 1e6;
    await redis.hset(LKEY, { [id]: l });
  } else {
    const l = memStore.get(id);
    if (!l) return;
    l.calls += 1;
    l.revenueUsdc = Math.round((l.revenueUsdc + l.priceUsdc) * 1e6) / 1e6;
  }
}
