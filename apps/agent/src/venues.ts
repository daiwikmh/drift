import { defiLlamaPools } from "@drip/shared";

// DefiLlama per-pool chart endpoint — same source the dashboard reads, so the
// agent and the UI can never disagree about what a venue yields.
export type VenueYield = { apy: number; tvlUsd: number; updatedAt: number };

async function fetchLlamaPool(poolId: string): Promise<VenueYield | undefined> {
  const res = await fetch(`https://yields.llama.fi/chart/${poolId}`);
  if (!res.ok) return undefined;
  const json = (await res.json()) as {
    data?: { timestamp: string; apy: number | null; tvlUsd: number | null }[];
  };
  const last = json.data?.[json.data.length - 1];
  if (!last || !Number.isFinite(Number(last.apy))) return undefined;
  return {
    apy: Number(last.apy) / 100,
    tvlUsd: Number(last.tvlUsd ?? 0),
    updatedAt: Date.parse(last.timestamp),
  };
}

export async function fetchRwaYields(): Promise<{
  usdy: VenueYield | undefined;
  meth: VenueYield | undefined;
}> {
  const [usdy, meth] = await Promise.allSettled([
    fetchLlamaPool(defiLlamaPools.usdyMantle),
    fetchLlamaPool(defiLlamaPools.methStaking),
  ]);
  return {
    usdy: usdy.status === "fulfilled" ? usdy.value : undefined,
    meth: meth.status === "fulfilled" ? meth.value : undefined,
  };
}
