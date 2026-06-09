export const usd = (n: number, max = 2) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: max });

export const pct = (n: number, digits = 2) => `${(n * 100).toFixed(digits)}%`;

export const shortAddr = (a?: string) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";

export function countdown(targetSec: number, nowMs: number): string {
  let s = Math.max(0, targetSec - Math.floor(nowMs / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}
