// Listing registry for the pay-per-call gateway. Durable when Upstash Redis is
// configured (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) — survives cold
// starts and works across Vercel serverless instances. Falls back to an in-memory
// Map when those env vars are absent, so local dev / un-provisioned deploys still
// run (state then lives only in the process, lost on restart). Same async
// interface either way — the API routes don't care which backend is active.
import { randomBytes } from "crypto";
import { Redis } from "@upstash/redis";
import { isCasperAccount, MIN_TRANSFER_CSPR, type CasperAccount } from "../casper";

export type Category = "ai" | "data" | "tool" | "other";

export type Listing = {
  id: string;
  name: string;
  description: string;
  upstreamUrl: string; // server-only — never sent to the client
  authHeaderName?: string; // server-only — owner's key to reach the upstream
  authHeaderValue?: string; // server-only — the secret value, injected by the gateway
  kind: "http" | "mcp";
  method: string;
  category: Category;
  priceCspr: number;
  payTo: CasperAccount;
  owner: CasperAccount;
  createdAt: number;
  calls: number;
  revenueCspr: number;
};

export type PublicListing = Omit<Listing, "upstreamUrl" | "authHeaderName" | "authHeaderValue"> & {
  hasAuth: boolean;
};

// A composition: a saved sequence of existing listings, each paid for and
// called in order. `bodyTemplate` for steps after the first may reference
// the previous step's response via "{{previous}}" (whole response, JSON) or
// "{{previous.someKey}}" (a top-level field) — substituted client-side at
// run time. No new payment mechanism: each step is a normal, separate
// pay-per-call purchase against its own listing.
export type PipelineStep = { listingId: string; bodyTemplate: string };

export type Pipeline = {
  id: string;
  name: string;
  description: string;
  owner: CasperAccount;
  steps: PipelineStep[];
  createdAt: number;
  calls: number;
};

const LKEY = "drift:listings"; // Redis hash: id -> Listing
const NKEY = "drift:nonces"; // Redis set: used EIP-3009 nonces
const PKEY = "drift:pipelines"; // Redis hash: id -> Pipeline

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
  _driftPipelines?: Map<string, Pipeline>;
};
if (!g._driftListings) g._driftListings = new Map();
if (!g._driftNonces) g._driftNonces = new Set();
if (!g._driftPipelines) g._driftPipelines = new Map();
const memStore = g._driftListings;
const memNonces = g._driftNonces;
const memPipelines = g._driftPipelines;

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
  const priceCspr = Number(i.priceCspr);
  const isAddr = (s: unknown): s is CasperAccount => typeof s === "string" && isCasperAccount(s);

  if (!name) return { error: "name required" };
  if (!/^https?:\/\//.test(upstreamUrl)) return { error: "upstreamUrl must be http(s)" };
  if (!(priceCspr >= MIN_TRANSFER_CSPR)) {
    return { error: `priceCspr must be >= ${MIN_TRANSFER_CSPR} (Casper's native-transfer minimum)` };
  }
  if (!isAddr(i.payTo)) return { error: "payTo must be a Casper account-hash address" };
  if (!isAddr(i.owner)) return { error: "owner must be a Casper account-hash address" };

  const kind = i.kind === "mcp" ? "mcp" : "http";
  const category: Category = ["ai", "data", "tool"].includes(i.category as string) ? (i.category as Category) : "other";
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
    category,
    method: kind === "mcp" ? "POST" : i.method === "GET" ? "GET" : "POST",
    priceCspr,
    payTo: i.payTo,
    owner: i.owner,
    createdAt: Date.now(),
    calls: 0,
    revenueCspr: 0,
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
    l.revenueCspr = Math.round((l.revenueCspr + l.priceCspr) * 1e6) / 1e6;
    await redis.hset(LKEY, { [id]: l });
  } else {
    const l = memStore.get(id);
    if (!l) return;
    l.calls += 1;
    l.revenueCspr = Math.round((l.revenueCspr + l.priceCspr) * 1e6) / 1e6;
  }
}

export async function listPipelines(): Promise<Pipeline[]> {
  const all = redis
    ? Object.values((await redis.hgetall<Record<string, Pipeline>>(PKEY)) ?? {})
    : [...memPipelines.values()];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPipeline(id: string): Promise<Pipeline | undefined> {
  if (redis) return (await redis.hget<Pipeline>(PKEY, id)) ?? undefined;
  return memPipelines.get(id);
}

export async function createPipeline(input: unknown): Promise<{ pipeline?: Pipeline; error?: string }> {
  const i = input as Partial<Pipeline>;
  const name = typeof i.name === "string" ? i.name.trim() : "";
  const isAddr = (s: unknown): s is CasperAccount => typeof s === "string" && isCasperAccount(s);
  const steps = Array.isArray(i.steps) ? i.steps : [];

  if (!name) return { error: "name required" };
  if (!isAddr(i.owner)) return { error: "owner must be a Casper account-hash address" };
  if (steps.length < 2) return { error: "a composition needs at least 2 steps" };
  for (const s of steps) {
    if (typeof s?.listingId !== "string" || !s.listingId) return { error: "each step needs a listingId" };
    if (typeof s?.bodyTemplate !== "string") return { error: "each step needs a bodyTemplate (JSON string)" };
    if (!(await getListing(s.listingId))) return { error: `unknown listing in step: ${s.listingId}` };
  }

  const pipeline: Pipeline = {
    id: randomBytes(6).toString("hex"),
    name,
    description: typeof i.description === "string" ? i.description.trim() : "",
    owner: i.owner,
    steps: steps.map((s) => ({ listingId: s.listingId, bodyTemplate: s.bodyTemplate })),
    createdAt: Date.now(),
    calls: 0,
  };
  if (redis) await redis.hset(PKEY, { [pipeline.id]: pipeline });
  else memPipelines.set(pipeline.id, pipeline);
  return { pipeline };
}

export async function recordPipelineCall(id: string): Promise<void> {
  if (redis) {
    const p = await redis.hget<Pipeline>(PKEY, id);
    if (!p) return;
    p.calls += 1;
    await redis.hset(PKEY, { [id]: p });
  } else {
    const p = memPipelines.get(id);
    if (p) p.calls += 1;
  }
}
