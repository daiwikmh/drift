// Address formatting for the feed/status bar. The wallet itself (the agent's
// identity) is loaded/created in store.ts.
export function shortAddr(a: string): string {
  return a.length >= 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
