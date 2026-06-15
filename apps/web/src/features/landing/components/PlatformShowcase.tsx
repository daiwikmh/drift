import { Reveal } from "./primitives";
import { Container } from "./Container";

function CliTerminal() {
  const A = "#9aa8f0";
  const UP = "#34d399";
  const DIM = "rgba(255,255,255,0.35)";
  const FAINT = "rgba(255,255,255,0.18)";
  const AMBER = "#fbbf24";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#08090c] font-mono text-[12px] leading-[1.75]">
      {/* title bar */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]/70" />
        <span className="ml-3 text-[11px] text-white/25">drift — zsh</span>
      </div>

      <div className="space-y-0 p-5">
        {/* launch */}
        <p style={{ color: FAINT }}>$ <span style={{ color: A }}>./drift</span></p>

        {/* boot line */}
        <p style={{ color: DIM }}>  ◇ engine&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; │ strategies · optimizer · backtester  <span style={{ color: UP }}>✓</span></p>
        <p style={{ color: DIM }}>  ◇ market data&nbsp; │ bybit public feed  <span style={{ color: UP }}>✓</span></p>
        <p style={{ color: DIM }}>  ◇ macroguard&nbsp;&nbsp; │ mantle sepolia · 0x4011…7ab3  <span style={{ color: UP }}>✓</span></p>
        <p className="mb-2" style={{ color: UP }}>  ✓ ready — just talk to me (how&apos;s btc?) or type a command</p>

        {/* research */}
        <p><span style={{ color: A }}>&gt; </span><span style={{ color: "rgba(255,255,255,0.8)" }}>research btc 1h</span></p>
        <p style={{ color: DIM }}>  sweeping parameter space · train/test split…</p>
        <p>
          <span style={{ color: A }}>  rsi&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span style={{ color: DIM }}>&nbsp;IS 4.12&nbsp;</span>
          <span style={{ color: UP }}>OOS 6.59</span>
          <span style={{ color: UP }}>&nbsp;robust ✓</span>
        </p>
        <p>
          <span style={{ color: A }}>  macd&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span style={{ color: DIM }}>&nbsp;IS 3.80&nbsp;</span>
          <span style={{ color: DIM }}>OOS 0.41</span>
          <span style={{ color: AMBER }}>&nbsp;overfit</span>
        </p>
        <p className="mb-2" style={{ color: DIM }}>  › deploy the winner: <span style={{ color: A }}>bot rsi btc 1h</span></p>

        {/* analyze */}
        <p><span style={{ color: A }}>&gt; </span><span style={{ color: "rgba(255,255,255,0.8)" }}>analyze btc</span></p>
        <p style={{ color: DIM }}>  analysing BTCUSDT · regime <span style={{ color: UP }}>risk-on</span></p>
        <p className="mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>  drift › RSI 42 — not yet oversold. Momentum positive, vol z-score −0.8. Regime favours long exposure.</p>

        {/* bot */}
        <p><span style={{ color: A }}>&gt; </span><span style={{ color: "rgba(255,255,255,0.8)" }}>bot rsi btc 1h</span></p>
        <p style={{ color: DIM }}>  bot live · BTCUSDT 1h · qty 0.001 · Ctrl-C to stop &amp; flatten</p>
        <p style={{ color: A }}>  ⛓ macroguard 0x4011cbAc… · logged 0x9bdf82a0…</p>
        <p>
          <span style={{ color: DIM }}>  equity </span><span style={{ color: "rgba(255,255,255,0.8)" }}>1 024.38</span>
          <span style={{ color: DIM }}>&nbsp;· position </span><span style={{ color: UP }}>long</span>
          <span style={{ color: DIM }}>&nbsp;· signal </span><span style={{ color: UP }}>long</span>
        </p>

        {/* prompt */}
        <p className="mt-1"><span style={{ color: A }}>&gt; </span><span className="inline-block h-[13px] w-[7px] animate-pulse bg-[#9aa8f0]/70 align-middle" /></p>
      </div>

      {/* status bar */}
      <div className="flex items-center gap-4 border-t border-white/[0.07] px-5 py-2 text-[11px]">
        <span style={{ color: A }}>agent drift</span>
        <span style={{ color: FAINT }}>·</span>
        <span style={{ color: AMBER }}>testnet</span>
        <span style={{ color: FAINT }}>·</span>
        <span style={{ color: UP }}>BTC ▲97,421</span>
        <span style={{ color: FAINT }}>·</span>
        <span style={{ color: UP }}>ETH ▲3,218</span>
        <span style={{ color: FAINT }}>·</span>
        <span style={{ color: DIM }}>bots 1</span>
      </div>
    </div>
  );
}

function Ic({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white/80" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const features = [
  { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", title: "Browse classic strategies,", body: "MACD, RSI, Bollinger and Dual Thrust, ready to configure and run." },
  { icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12", title: "Backtest on real history,", body: "live Bybit klines — no synthetic data, no cherry-picked windows." },
  { icon: "M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", title: "Read honest metrics,", body: "Sharpe, drawdown, and win rate — point-in-time, with no look-ahead." },
  { icon: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9h16M8 4v5", title: "Tune every parameter,", body: "a slider for each input; nothing hidden inside a black box." },
  { icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", title: "Deploy to Bybit testnet,", body: "real market orders, with API keys held in memory only." },
  { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", title: "Risk that stops itself,", body: "a per-bot drawdown stop flattens the position and halts the bot." },
];

export function PlatformShowcase() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* spectrum band decoration */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-2 opacity-70">
        {["#3b82f6", "#38bdf8", "#a3e635", "#facc15", "#fb923c", "#f87171", "#ef4444"].map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      {/* soft glow behind the panel */}
      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-[420px] w-[560px] rounded-full opacity-30 blur-[130px]"
        style={{ background: "radial-gradient(circle, #4f46e5, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-10 h-[360px] w-[460px] rounded-full opacity-20 blur-[130px]"
        style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)" }}
      />

      <Container className="grid items-start gap-10 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Configure. Backtest. Deploy.</h2>
          <p className="mt-3 text-[14px] text-white/40">One command. Full-screen terminal agent — markets, optimizer, AI analyst, live bots.</p>
          <div className="mt-6">
            <CliTerminal />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-sm">
            <div className="border-b border-white/10 px-6 py-5">
              <h3 className="text-[15px] font-medium text-white">A transparent trading engine</h3>
              <p className="mt-0.5 text-[13px] text-white/40">point-in-time backtests · live on Bybit</p>
            </div>
            <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="divide-y divide-white/10">
                {features.slice(0, 3).map((f) => (
                  <div key={f.title} className="p-6">
                    <Ic d={f.icon} />
                    <h3 className="mt-4 text-[15px] font-medium text-white">{f.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/40">{f.body}</p>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-white/10">
                {features.slice(3).map((f) => (
                  <div key={f.title} className="p-6">
                    <Ic d={f.icon} />
                    <h3 className="mt-4 text-[15px] font-medium text-white">{f.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/40">{f.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
