// yield-allocator: a verifiable capital-deployment plan over EXISTING Avalanche
// vaults. Grounded in real live APY/TVL from DefiLlama (no mock, no custom vault) —
// the provider just recommends an allocation across audited protocols; execution and
// custody stay with those protocols. Later verifiable: did the projected APY hold?
import { complete, llmEnabled } from "../llm.js";

type LlamaPool = {
  chain: string;
  project: string;
  symbol: string;
  apy: number | null;
  tvlUsd: number;
  pool: string;
  stablecoin?: boolean;
  ilRisk?: string;
};

export type VaultPick = {
  project: string;
  symbol: string;
  apy: number;
  tvlUsd: number;
  pool: string; // DefiLlama pool id
  stable: boolean;
  allocationPct: number;
  usd: number;
};

export type Allocation = {
  capital: number;
  risk: "conservative" | "balanced" | "aggressive";
  items: VaultPick[];
  blendedApy: number;
  projYearUsd: number;
  rationale: string;
  issuedAt: number;
  model?: string | null;
};

async function fetchAvalanchePools(): Promise<LlamaPool[]> {
  const r = await fetch("https://yields.llama.fi/pools");
  const j = (await r.json()) as { data?: LlamaPool[] };
  return (j.data ?? []).filter((p) => p.chain === "Avalanche" && (p.apy ?? 0) > 0 && p.tvlUsd > 1_000_000);
}

function parseCapital(brief: string): number {
  const m = brief.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Math.max(1, Number(m[1])) : 1000;
}
function parseRisk(brief: string): Allocation["risk"] {
  const b = brief.toLowerCase();
  if (/(conserv|safe|low.?risk|stable)/.test(b)) return "conservative";
  if (/(aggress|degen|high.?risk|max)/.test(b)) return "aggressive";
  return "balanced";
}

const STABLE = /\b(USDC|USDT|DAI|USD|FRAX|GHO|sAVUSD|avUSD)\b/i;

export async function generateAllocation(brief: string): Promise<Allocation> {
  const capital = parseCapital(brief);
  const risk = parseRisk(brief);
  let pools = await fetchAvalanchePools();

  // risk shaping: cap implausibly-high (incentive-driven, unsustainable) APYs by
  // risk, and for conservative restrict to stablecoin vaults.
  const apyCap = risk === "conservative" ? 15 : risk === "balanced" ? 40 : 1e9;
  const all = pools;
  pools = pools.filter((p) => (p.apy ?? 0) <= apyCap && (risk !== "conservative" || p.stablecoin || STABLE.test(p.symbol)));
  if (pools.length < 3) pools = all.filter((p) => (p.apy ?? 0) <= (risk === "aggressive" ? 1e9 : 80)); // fall back if over-filtered

  // risk-adjusted score: aggressive weights APY, conservative weights TVL safety
  const apyW = risk === "aggressive" ? 1 : risk === "balanced" ? 0.6 : 0.35;
  const tvlW = 1 - apyW;
  const maxApy = Math.max(...pools.map((p) => p.apy ?? 0), 1);
  const maxTvl = Math.max(...pools.map((p) => p.tvlUsd), 1);
  const scored = pools
    .map((p) => ({ p, score: apyW * ((p.apy ?? 0) / maxApy) + tvlW * (p.tvlUsd / maxTvl) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, risk === "aggressive" ? 4 : 3);

  const totalScore = scored.reduce((s, x) => s + x.score, 0) || 1;
  const items: VaultPick[] = scored.map(({ p, score }) => {
    const allocationPct = Math.round((score / totalScore) * 100);
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
  // fix rounding drift to 100%
  const drift = 100 - items.reduce((s, i) => s + i.allocationPct, 0);
  if (items[0]) {
    items[0].allocationPct += drift;
    items[0].usd = Math.round((capital * items[0].allocationPct) / 100);
  }

  const blendedApy = Number(items.reduce((s, i) => s + (i.allocationPct / 100) * i.apy, 0).toFixed(2));
  const projYearUsd = Math.round((capital * blendedApy) / 100);

  let rationale =
    `${risk} plan for $${capital.toLocaleString()} across ${items.length} Avalanche vaults — ` +
    `blended ${blendedApy}% APY (~$${projYearUsd}/yr). ` +
    items.map((i) => `${i.allocationPct}% ${i.project}/${i.symbol} @ ${i.apy}%`).join(", ") + ".";
  let model: string | null = null;

  if (llmEnabled()) {
    const facts =
      `risk=${risk} capital=$${capital}. candidate vaults: ` +
      items.map((i) => `${i.project}/${i.symbol} apy ${i.apy}% tvl $${(i.tvlUsd / 1e6).toFixed(0)}M alloc ${i.allocationPct}%`).join("; ");
    try {
      const out = await complete(
        "You are a DeFi yield strategist. In <=240 chars, justify this allocation using ONLY the given real APY/TVL numbers. No new numbers, no hype.",
        facts
      );
      const clean = out?.trim() ?? "";
      // Reasoning models (e.g. nemotron) can leak their scratchpad into content.
      // Only adopt the LLM line if it reads like a real justification — cites a
      // number and isn't an internal monologue — else keep the deterministic one.
      const looksReal = /\d/.test(clean) && !/^(we need|let me|okay|first,|the user|i should|probably)/i.test(clean);
      if (clean && looksReal) {
        rationale = clean.slice(0, 240);
        const { llmMeta } = await import("../llm.js");
        model = llmMeta()?.model ?? null;
      }
    } catch {
      /* keep deterministic rationale */
    }
  }

  return { capital, risk, items, blendedApy, projYearUsd, rationale, issuedAt: Math.floor(Date.now() / 1000), model };
}
