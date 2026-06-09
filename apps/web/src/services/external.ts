// Real off-chain data sources that exist independently of the DRIP contracts.
// Every function returns live data or null on failure — never a fabricated value.

import { defiLlamaPools } from "@drip/shared";

// --- Pyth (Hermes pull oracle) -------------------------------------------
// Free price service. Feed IDs: https://pyth.network/developers/price-feed-ids
const HERMES = "https://hermes.pyth.network/v2/updates/price/latest";

export const PYTH_FEEDS: Record<string, string> = {
  "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "USDC/USD": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
};

export type PythPrice = { symbol: string; price: number; publishTime: number };

export async function fetchPythPrices(symbols: string[]): Promise<PythPrice[]> {
  const ids = symbols.map((s) => PYTH_FEEDS[s]).filter(Boolean);
  if (ids.length === 0) return [];
  const qs = ids.map((id) => `ids[]=${id}`).join("&");
  const res = await fetch(`${HERMES}?${qs}&parsed=true`);
  if (!res.ok) throw new Error(`Hermes ${res.status}`);
  const data = await res.json();
  const out: PythPrice[] = [];
  for (const p of data.parsed ?? []) {
    const symbol = symbols.find((s) => PYTH_FEEDS[s]?.slice(2) === p.id) ?? p.id;
    const expo = p.price.expo as number;
    const raw = Number(p.price.price);
    out.push({
      symbol,
      price: raw * 10 ** expo,
      publishTime: p.price.publish_time,
    });
  }
  return out;
}

// --- Mantle RWA venue yields (DefiLlama per-pool chart) --------------------
// The v1 venues from the DRIP spec: USDY on Mantle and the mETH staking
// yield. Pool ids live in @drip/shared, verified against yields.llama.fi.

export type VenueYield = { apy: number; tvlUsd: number; updatedAt: number };

async function fetchLlamaPool(poolId: string): Promise<VenueYield | null> {
  const res = await fetch(`https://yields.llama.fi/chart/${poolId}`);
  if (!res.ok) return null;
  const json = await res.json();
  const last = json.data?.[json.data.length - 1];
  if (!last || !Number.isFinite(Number(last.apy))) return null;
  return {
    apy: Number(last.apy) / 100,
    tvlUsd: Number(last.tvlUsd ?? 0),
    updatedAt: Date.parse(last.timestamp),
  };
}

export type RwaYields = { usdy: VenueYield | null; meth: VenueYield | null };

export async function fetchRwaYields(): Promise<RwaYields> {
  const [usdy, meth] = await Promise.allSettled([
    fetchLlamaPool(defiLlamaPools.usdyMantle),
    fetchLlamaPool(defiLlamaPools.methStaking),
  ]);
  return {
    usdy: usdy.status === "fulfilled" ? usdy.value : null,
    meth: meth.status === "fulfilled" ? meth.value : null,
  };
}
