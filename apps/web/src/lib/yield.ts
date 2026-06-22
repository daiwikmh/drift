// Browser yield-allocator: builds a capital-deployment plan over EXISTING Avalanche
// vaults from real live DefiLlama APY/TVL — so a tab can serve yield-allocator with
// no key. Mirrors the agent's compute/yield.ts.
import type { AllocationPayload, VaultPick } from "./market";

type LlamaPool = { chain: string; project: string; symbol: string; apy: number | null; tvlUsd: number; pool: string; stablecoin?: boolean };

const STABLE = /\b(USDC|USDT|DAI|USD|FRAX|GHO|sAVUSD|avUSD)\b/i;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

async function fetchAvalanchePools(): Promise<LlamaPool[]> {
  const r = await fetch("https://yields.llama.fi/pools");
  const j = (await r.json()) as { data?: LlamaPool[] };
  return (j.data ?? []).filter((p) => p.chain === "Avalanche" && (p.apy ?? 0) > 0 && p.tvlUsd > 1_000_000);
}

export async function generateAllocation(
  brief: string,
  llm?: (system: string, user: string) => Promise<string | null>
): Promise<AllocationPayload> {
  const capital = Math.max(1, Number(brief.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/)?.[1] ?? 1000));
  const b = brief.toLowerCase();
  const risk: AllocationPayload["risk"] = /(conserv|safe|low.?risk|stable)/.test(b)
    ? "conservative"
    : /(aggress|degen|high.?risk|max)/.test(b)
      ? "aggressive"
      : "balanced";

  let pools = await fetchAvalanchePools();
  const apyCap = risk === "conservative" ? 15 : risk === "balanced" ? 40 : 1e9;
  const all = pools;
  pools = pools.filter((p) => (p.apy ?? 0) <= apyCap && (risk !== "conservative" || p.stablecoin || STABLE.test(p.symbol)));
  if (pools.length < 3) pools = all.filter((p) => (p.apy ?? 0) <= (risk === "aggressive" ? 1e9 : 80));

  const apyW = risk === "aggressive" ? 1 : risk === "balanced" ? 0.6 : 0.35;
  const tvlW = 1 - apyW;
  const maxApy = Math.max(...pools.map((p) => p.apy ?? 0), 1);
  const maxTvl = Math.max(...pools.map((p) => p.tvlUsd), 1);
  const scored = pools
    .map((p) => ({ p, score: apyW * ((p.apy ?? 0) / maxApy) + tvlW * (p.tvlUsd / maxTvl) }))
    .sort((a, b2) => b2.score - a.score)
    .slice(0, risk === "aggressive" ? 4 : 3);

  const total = scored.reduce((s, x) => s + x.score, 0) || 1;
  const items: VaultPick[] = scored.map(({ p, score }) => {
    const allocationPct = Math.round((score / total) * 100);
    return {
      project: p.project,
      symbol: p.symbol,
      apy: Number((p.apy ?? 0).toFixed(2)),
      tvlUsd: p.tvlUsd,
      pool: p.pool,
      stable: !!p.stablecoin || STABLE.test(p.symbol),
      allocationPct,
      usd: Math.round((capital * allocationPct) / 100),
    };
  });
  const drift = 100 - items.reduce((s, i) => s + i.allocationPct, 0);
  if (items[0]) {
    items[0].allocationPct += drift;
    items[0].usd = Math.round((capital * items[0].allocationPct) / 100);
  }

  const blendedApy = Number(items.reduce((s, i) => s + (i.allocationPct / 100) * i.apy, 0).toFixed(2));
  const projYearUsd = Math.round((capital * blendedApy) / 100);
  let rationale =
    `${risk} plan for $${capital.toLocaleString()} across ${items.length} Avalanche vaults — blended ${blendedApy}% APY (~$${projYearUsd}/yr): ` +
    items.map((i) => `${i.allocationPct}% ${i.project}/${i.symbol} @ ${i.apy}%`).join(", ") + ".";

  if (llm) {
    try {
      const out = await llm(
        "You are a DeFi yield strategist. In <=240 chars justify this allocation using ONLY the given real APY/TVL numbers. No new numbers, no hype.",
        items.map((i) => `${i.project}/${i.symbol} apy ${i.apy}% tvl $${(i.tvlUsd / 1e6).toFixed(0)}M alloc ${i.allocationPct}%`).join("; ")
      );
      if (out?.trim()) rationale = out.trim().slice(0, 240);
    } catch {
      /* keep deterministic */
    }
  }

  return { capital, risk, items, blendedApy, projYearUsd, rationale, issuedAt: Math.floor(Date.now() / 1000) };
}
