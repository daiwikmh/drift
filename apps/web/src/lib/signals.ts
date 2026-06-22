// Buyer-side trade-signal records: kept in localStorage until they can be settled
// against real price. Settlement scores the call and the result feeds on-chain
// reputation (giveFeedback weighted by outcome) — mirrors the CLI.
import type { SignalPayload } from "./market";

export type SignalRecord = {
  id: string;
  provider: string;
  agentId?: number;
  signal: SignalPayload;
  boughtAt: number;
  settled?: boolean;
  outcome?: { hit: boolean; pnlPct: number; exitPrice: number; value: number; feedbackTx?: `0x${string}` };
};

const key = (addr: string) => `drift.signals.${addr.toLowerCase()}`;

export function loadSignals(addr: string): SignalRecord[] {
  try {
    return JSON.parse(localStorage.getItem(key(addr)) ?? "[]") as SignalRecord[];
  } catch {
    return [];
  }
}

export function saveSignals(addr: string, list: SignalRecord[]): void {
  localStorage.setItem(key(addr), JSON.stringify(list));
}

export function addSignal(addr: string, rec: SignalRecord): void {
  const list = loadSignals(addr);
  list.push(rec);
  saveSignals(addr, list);
}

// Live spot price from Bybit (public) — the price a signal is scored against.
export async function spotPrice(symbol: string): Promise<number> {
  const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
  const j = (await r.json()) as { result?: { list?: Array<{ lastPrice: string }> } };
  const p = j.result?.list?.[0]?.lastPrice;
  if (!p) throw new Error(`no price for ${symbol}`);
  return Number(p);
}

async function closes(symbol: string, interval = "60", limit = 48): Promise<number[]> {
  const r = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`);
  const j = (await r.json()) as { result?: { list?: string[][] } };
  return (j.result?.list ?? []).map((row) => Number(row[4])).reverse();
}

const KNOWN = ["BTC", "ETH", "SOL", "AVAX", "BNB", "XRP", "DOGE", "ADA", "ARB", "OP", "LINK", "SUI"];
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

// Generate a trade signal in the browser: real Bybit data + a deterministic
// momentum rule (always works, no key), optionally refined by an LLM callback.
export async function generateSignal(
  brief: string,
  llm?: (system: string, user: string) => Promise<string | null>
): Promise<SignalPayload> {
  const up = brief.toUpperCase();
  const symbol = (KNOWN.find((k) => new RegExp(`\\b${k}\\b`).test(up)) ?? "BTC") + "USDT";
  const [last, series] = await Promise.all([spotPrice(symbol), closes(symbol)]);
  const s = series.length ? series : [last];
  const rets = s.slice(1).map((c, i) => (c - s[i]) / s[i]);
  const mean = avg(rets);
  const vol = Math.sqrt(avg(rets.map((r) => (r - mean) ** 2))) || 1e-9;
  const momentum = s.length ? (s[s.length - 1] - s[0]) / s[0] : 0;
  const trend = s[s.length - 1] > avg(s) ? "up" : "down";
  const z = momentum / (vol * Math.sqrt(48));

  let direction: SignalPayload["direction"] = z > 0.3 ? "long" : z < -0.3 ? "short" : "flat";
  let confidence = Math.min(1, Math.abs(z) || 0.2);
  let rationale = `${direction} ${symbol} over 24h — momentum ${(momentum * 100).toFixed(2)}%, trend ${trend}.`;
  let model: string | null = null;

  if (llm) {
    const facts =
      `${symbol} last $${last} · momentum ${(momentum * 100).toFixed(2)}% · trend ${trend} · ` +
      `realized vol ${(vol * 100).toFixed(2)}% · rule prior ${direction} (${confidence.toFixed(2)})`;
    const sys =
      "You are a crypto trade-signal agent. Using ONLY the metrics given, output one JSON object and nothing else: " +
      '{"direction":"long|short|flat","confidence":0..1,"rationale":"<=200 chars"}. Never invent numbers.';
    try {
      const out = await llm(sys, facts);
      const m = out?.match(/\{[\s\S]*\}/);
      if (m) {
        const j = JSON.parse(m[0]) as { direction?: string; confidence?: number; rationale?: string };
        if (j.direction === "long" || j.direction === "short" || j.direction === "flat") direction = j.direction;
        if (typeof j.confidence === "number") confidence = Math.max(0, Math.min(1, j.confidence));
        if (j.rationale?.trim()) rationale = j.rationale.trim().slice(0, 200);
        model = "llm";
      }
    } catch {
      /* keep rule-based */
    }
  }

  return { symbol, direction, horizonHours: 24, entryPrice: last, confidence, rationale, issuedAt: Math.floor(Date.now() / 1000), model };
}

export type Score = { settled: boolean; hit: boolean; pnlPct: number; exitPrice: number; value: number; readyAt: number };

export function scoreSignal(s: SignalPayload, currentPrice: number): Score {
  const readyAt = s.issuedAt + s.horizonHours * 3600;
  const move = (currentPrice - s.entryPrice) / s.entryPrice;
  const hit = s.direction === "long" ? move > 0 : s.direction === "short" ? move < 0 : Math.abs(move) < 0.005;
  const pnlPct = (s.direction === "short" ? -move : s.direction === "flat" ? -Math.abs(move) : move) * 100;
  return { settled: Date.now() / 1000 >= readyAt, hit, pnlPct, exitPrice: currentPrice, value: hit ? 100 : 0, readyAt };
}
