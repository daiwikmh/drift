// Live crypto market data from Bybit's public V5 API (no key). Real data only —
// it grounds the trade-signal (the entry price + indicators a prediction is made
// against, and the price it's later scored on).
const BASE = "https://api.bybit.com/v5/market";

export type Ticker = { symbol: string; last: number; change24h: number; high24h: number; low24h: number };

export async function ticker(symbol: string): Promise<Ticker> {
  const r = await fetch(`${BASE}/tickers?category=spot&symbol=${symbol}`);
  const j = (await r.json()) as { result?: { list?: Array<Record<string, string>> } };
  const t = j.result?.list?.[0];
  if (!t) throw new Error(`no market data for ${symbol}`);
  return {
    symbol,
    last: Number(t.lastPrice),
    change24h: Number(t.price24hPcnt),
    high24h: Number(t.highPrice24h),
    low24h: Number(t.lowPrice24h),
  };
}

// Recent closes, oldest → newest.
export async function closes(symbol: string, interval = "60", limit = 48): Promise<number[]> {
  const r = await fetch(`${BASE}/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`);
  const j = (await r.json()) as { result?: { list?: string[][] } };
  return (j.result?.list ?? []).map((row) => Number(row[4])).reverse();
}

// Current spot price — used to score a signal at settlement.
export async function spotPrice(symbol: string): Promise<number> {
  return (await ticker(symbol)).last;
}
