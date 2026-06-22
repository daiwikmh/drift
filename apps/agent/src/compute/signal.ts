// trade-signal: a verifiable prediction. The provider issues a structured signal
// grounded in real Bybit data (so the entry price is real); after the horizon it is
// scored against the actual price — that realized outcome is what feeds on-chain
// reputation. The LLM adds the call + rationale; if no LLM key is set we fall back
// to a deterministic momentum rule so a signal is always real, never fabricated.
import { closes, ticker } from "./market.js";
import { complete, llmEnabled } from "../llm.js";

export type Direction = "long" | "short" | "flat";

export type Signal = {
  symbol: string; // e.g. BTCUSDT
  direction: Direction;
  horizonHours: number;
  entryPrice: number;
  confidence: number; // 0..1
  rationale: string;
  issuedAt: number; // unix seconds
  model?: string | null;
};

const KNOWN = ["BTC", "ETH", "SOL", "AVAX", "BNB", "XRP", "DOGE", "ADA", "ARB", "OP", "LINK", "MNT", "SUI"];

function parseSymbol(brief: string): string {
  const up = brief.toUpperCase();
  return (KNOWN.find((k) => new RegExp(`\\b${k}\\b`).test(up)) ?? "BTC") + "USDT";
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

function indicators(series: number[]) {
  const rets = series.slice(1).map((c, i) => (c - series[i]) / series[i]);
  const mean = avg(rets);
  const vol = Math.sqrt(avg(rets.map((r) => (r - mean) ** 2))) || 1e-9;
  const sma = avg(series);
  const last = series[series.length - 1];
  const momentum = series.length ? (last - series[0]) / series[0] : 0;
  return { sma, last, momentum, vol, trend: last > sma ? "up" : "down" };
}

// Deterministic momentum rule — the honest fallback (and a prior for the LLM).
function ruleSignal(momentum: number, vol: number): { direction: Direction; confidence: number } {
  const z = momentum / (vol * Math.sqrt(48));
  if (z > 0.3) return { direction: "long", confidence: Math.min(1, z) };
  if (z < -0.3) return { direction: "short", confidence: Math.min(1, -z) };
  return { direction: "flat", confidence: Math.min(1, 1 - Math.abs(z)) };
}

export async function generateSignal(brief: string): Promise<Signal> {
  const symbol = parseSymbol(brief);
  const [t, series] = await Promise.all([ticker(symbol), closes(symbol)]);
  const ind = indicators(series.length ? series : [t.last]);
  const base = ruleSignal(ind.momentum, ind.vol);
  const horizonHours = 24;

  const facts =
    `${symbol} last $${t.last} · 24h ${(t.change24h * 100).toFixed(2)}% · ` +
    `range $${t.low24h}–$${t.high24h} · trend ${ind.trend} · ` +
    `momentum ${(ind.momentum * 100).toFixed(2)}% · realized vol ${(ind.vol * 100).toFixed(2)}% (1h,48) · ` +
    `rule prior: ${base.direction} (${base.confidence.toFixed(2)})`;

  let direction = base.direction;
  let confidence = base.confidence;
  let rationale = `${base.direction} ${symbol} over ${horizonHours}h — momentum ${(ind.momentum * 100).toFixed(2)}%, trend ${ind.trend}.`;
  let model: string | null = null;

  if (llmEnabled()) {
    const sys =
      "You are a crypto trade-signal agent. Using ONLY the real metrics provided, output a single JSON object " +
      'and nothing else: {"direction":"long|short|flat","confidence":0..1,"rationale":"<=200 chars"}. ' +
      "Never invent numbers. Be decisive but honest about uncertainty.";
    try {
      const out = await complete(sys, facts);
      const m = out?.match(/\{[\s\S]*\}/);
      if (m) {
        const j = JSON.parse(m[0]) as { direction?: string; confidence?: number; rationale?: string };
        if (j.direction === "long" || j.direction === "short" || j.direction === "flat") direction = j.direction;
        if (typeof j.confidence === "number") confidence = Math.max(0, Math.min(1, j.confidence));
        if (typeof j.rationale === "string" && j.rationale.trim()) rationale = j.rationale.trim().slice(0, 200);
        const { llmMeta } = await import("../llm.js");
        model = llmMeta()?.model ?? null;
      }
    } catch {
      /* keep the rule-based signal */
    }
  }

  return { symbol, direction, horizonHours, entryPrice: t.last, confidence, rationale, issuedAt: Math.floor(Date.now() / 1000), model };
}

export type Score = { settled: boolean; hit: boolean; pnlPct: number; exitPrice: number; value: number; readyAt: number };

// Score a signal against the current price. value (0..100) is what feeds on-chain
// reputation: 100 on a correct call, 0 on a wrong one.
export function scoreSignal(s: Signal, currentPrice: number): Score {
  const readyAt = s.issuedAt + s.horizonHours * 3600;
  const move = (currentPrice - s.entryPrice) / s.entryPrice;
  const hit = s.direction === "long" ? move > 0 : s.direction === "short" ? move < 0 : Math.abs(move) < 0.005;
  const pnlPct = (s.direction === "short" ? -move : s.direction === "flat" ? -Math.abs(move) : move) * 100;
  return {
    settled: Math.floor(Date.now() / 1000) >= readyAt,
    hit,
    pnlPct,
    exitPrice: currentPrice,
    value: hit ? 100 : 0,
    readyAt,
  };
}
