export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "code"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "blockquote"; text: string }

export interface BlogPost {
  slug: string
  tag: string
  accent: string
  title: string
  date: string
  readTime: string
  excerpt: string
  content: ContentBlock[]
}

export const posts: BlogPost[] = [
  {
    slug: "why-we-built-drift",
    tag: "Origin",
    accent: "#9aa8f0",

    title: "Why We Built DRIFT",
    date: "June 2, 2026",
    readTime: "4 min",
    excerpt:
      "Most backtests are dishonest. Not intentionally — the industry just normalised a set of practices that make historical performance look better than it ever was.",
    content: [
      {
        type: "p",
        text: "Most backtests are dishonest. Not intentionally — the industry just normalised a set of practices that make historical performance look better than it ever was. Signal computed on bar t trades on bar t. Parameters optimised over the full dataset, including data the strategy would never have seen live. Sharpe ratios that no live strategy has ever reliably replicated.",
      },
      { type: "h2", text: "The academic tail" },
      {
        type: "p",
        text: "We had been reading the recent wave of AI trading papers — TradingAgents (arXiv 2412.20138), FinMem, TradingGroup — and noticed a pattern. Every paper adds risk controls in software: a risk-controller agent that sits alongside the signal agent and says \"not this trade.\" Smart. But software-based risk controls can be overridden, misconfigured, or simply not triggered in the moment that matters.",
      },
      {
        type: "p",
        text: "The original idea came from asking: what if the risk floor was somewhere no one could touch it? A Mantle-deployed smart contract that read on-chain price feeds and enforced max-leverage and drawdown-stop on-chain, not in a Python if-statement. We called it MacroGuard.",
      },
      { type: "h2", text: "Scoping down, keeping honest" },
      {
        type: "p",
        text: "We eventually scoped the MVP down — no Solidity, CeFi-only on Bybit. But the honesty commitment stayed. DRIFT runs point-in-time backtests where position[t] is always shifted +1 bar before execution. The equity curve you see is the one you would have earned. The drawdown stop that halts a bot is code, not a UI toggle.",
      },
      {
        type: "blockquote",
        text: "Profit Mirage (arXiv 2510.07920) is the canonical paper on backtest inflation. We read it before writing a single line of the backtester and built the shift directly into the vectorised engine.",
      },
      {
        type: "p",
        text: "The name stood: Deterministic Risk-bounded Intelligent Financial Trading. The point-in-time constraint and the bounded risk stop are not features — they are the product.",
      },
    ],
  },
  {
    slug: "the-engine-room",
    tag: "Engineering",
    accent: "#34d399",

    title: "The Engine Room: How DRIFT Works",
    date: "June 8, 2026",
    readTime: "6 min",
    excerpt:
      "DRIFT is two services: a Python FastAPI engine and a Next.js cockpit. Here is what every module does and why it is built the way it is.",
    content: [
      {
        type: "p",
        text: "DRIFT is two services that talk over REST and WebSockets. The engine is Python (FastAPI, port 8099). The cockpit is Next.js 15 with Tailwind. There is no database, no blockchain, no message queue. Every design decision traded sophistication for verifiability.",
      },
      { type: "h2", text: "The engine (apps/trader)" },
      { type: "h3", text: "bybit_client.py" },
      {
        type: "p",
        text: "A thin pybit V5 wrapper. Two modes: public (unauthenticated, always mainnet, used for klines and tickers) and authenticated (user keys, testnet or live, used for wallet balance, position size, and market orders). Keys are passed in and held in memory — never written to disk.",
      },
      { type: "h3", text: "strategies/" },
      {
        type: "p",
        text: "A Strategy ABC with one abstract method: positions(df) returning a pd.Series of {-1, 0, 1}. Each concrete class is a pure function of historical OHLCV bars. No internal state, no lookahead. Four implementations ship today: MACD, RSI, Bollinger, DualThrust.",
      },
      { type: "h3", text: "backtester.py" },
      {
        type: "p",
        text: "Vectorised. The signal on bar t is shifted +1 bar before multiplying by returns, so execution is always one bar later than the signal. This is the point-in-time constraint. Metrics computed: total return, annualised Sharpe (bars-per-year from a TIMEFRAMES map), win rate, max drawdown, trade count.",
      },
      {
        type: "code",
        text: "# The only line that matters in the backtester\npositions = strat.positions(df).shift(1).fillna(0)",
      },
      { type: "h3", text: "optimize.py" },
      {
        type: "p",
        text: "Sweeps a configurable param grid across all strategies (max 240 combinations to stay under one second). Splits data 70/30. Selects the best config by in-sample Sharpe among configs with at least 2 trades — the guard prevents a no-trade config from winning by default. Reports out-of-sample metrics. Verdict: robust (both IS and OOS Sharpe >= 0.5), overfit (IS good, OOS < 40% of IS), or weak.",
      },
      { type: "h3", text: "live.py" },
      {
        type: "p",
        text: "Connection holds one authenticated BybitClient in memory. BotManager creates one asyncio Task per bot. The loop: every 15 seconds, fetch 200 bars of klines, compute signal, compare to current position, place a market order if delta is not zero, read account equity, check drawdown stop. If breached, flatten the position and halt.",
      },
      { type: "h2", text: "The cockpit (apps/web)" },
      {
        type: "p",
        text: "Five routes under /dashboard: Markets (live ticker list + candlestick, deploy-bot inline), Bots (per-bot candlestick with fill markers, WS-driven equity/PnL/drawdown, kill switch), Portfolio (account equity, positions table), Research (AutoResearch optimizer leaderboard), Connection (API key entry, read or trade scope).",
      },
      {
        type: "p",
        text: "The landing and dashboard share a dark theme ported from the neurus codebase: bg-black for the landing, bg-[#0b0c0f] for the dashboard, periwinkle #9aa8f0 accent throughout. No wallet, no blockchain — the cockpit is purely a REST and WebSocket client over the engine.",
      },
    ],
  },
  {
    slug: "four-ways-to-read-the-market",
    tag: "Research",
    accent: "#f59e0b",

    title: "Four Ways to Read the Market",
    date: "June 10, 2026",
    readTime: "5 min",
    excerpt:
      "MACD, RSI, Bollinger Bands, Dual Thrust. Each strategy bets on a different market regime. Here is the logic behind each signal.",
    content: [
      {
        type: "p",
        text: "All four strategies share the same interface: receive a DataFrame of OHLCV bars, return a Series of position signals — 1 (long), -1 (short), 0 (flat). They are pure functions. The backtester treats them identically. Each one bets on a different market regime. The AutoResearch optimizer will tell you which one is working right now.",
      },
      { type: "h2", text: "MACD — Momentum" },
      {
        type: "p",
        text: "Golden cross / death cross on the MACD histogram. When the fast EMA crosses above the slow, go long. Below, go short. Simple directional momentum: bet that the trend continues.",
      },
      {
        type: "ul",
        items: [
          "Fast period: 12 bars",
          "Slow period: 26 bars",
          "Signal smoothing: 9 bars",
          "Works best in: trending markets",
        ],
      },
      { type: "h2", text: "RSI — Mean Reversion" },
      {
        type: "p",
        text: "Oversold (RSI < 30) means long. Overbought (RSI > 70) means short. The mean-reversion thesis: price extremes revert. The opposite bet from MACD — when RSI says the market has gone too far, you fade it.",
      },
      {
        type: "ul",
        items: [
          "Period: 14 bars",
          "Thresholds: 30 / 70 (configurable)",
          "Works best in: ranging, sideways markets",
        ],
      },
      { type: "h2", text: "Bollinger Bands — Volatility" },
      {
        type: "p",
        text: "Price crossing below the lower band triggers long. Above the upper band triggers short. A volatility-aware variant of RSI: the bands expand during trending moves, so you only enter on deviations that are extreme relative to recent volatility, not just absolute price level.",
      },
      {
        type: "ul",
        items: [
          "Period: 20 bars",
          "Width: 2 standard deviations (configurable)",
          "Works best in: mean-reverting markets with variable volatility",
        ],
      },
      { type: "h2", text: "Dual Thrust — Breakout" },
      {
        type: "p",
        text: "Sets a range at the start of each period using the previous N bars high/low range, scaled by a K factor. Break above the upper rail means long. Break below the lower rail means short. Originally designed for futures by Michael Chalek. It handles trending markets where RSI and Bollinger produce whipsaws.",
      },
      {
        type: "ul",
        items: [
          "Range bars: 4",
          "K factor: 0.5 (configurable)",
          "Works best in: breakout and trending regimes",
        ],
      },
      { type: "h2", text: "How the optimizer chooses" },
      {
        type: "p",
        text: "The AutoResearch engine sweeps a param grid across all four strategies, selects the best config by in-sample Sharpe (train set), and reports out-of-sample metrics. A config is robust only if both IS and OOS Sharpe exceed 0.5. One regime, one winner — the rest are marked overfit or weak.",
      },
      {
        type: "blockquote",
        text: "On 1h BTC data, RSI is the consistent robust winner with OOS Sharpe around 6.5. On 4h, everything is overfit. The market tells you which regime it is in — the optimizer surfaces it.",
      },
    ],
  },
  {
    slug: "building-on-mantle",
    tag: "Ecosystem",
    accent: "#c084fc",

    title: "Building on Mantle: AI Meets RWA",
    date: "June 12, 2026",
    readTime: "4 min",
    excerpt:
      "DRIFT started as two ideas that converged: an RWA yield optimizer for Mantle and an AI trading layer. Here is the Mantle thesis and what we plan to build.",
    content: [
      {
        type: "p",
        text: "DRIFT started as two ideas that almost merged completely. DRIP was an RWA yield optimizer built for the Mantle Turing Test Hackathon 2026 — $120k pool, AI x RWA track. DRIFT was the AI trading layer that would sit on top. We merged them, scoped the MVP to what we could verify in a weekend, and shipped: the Python engine and Bybit CeFi execution. The Mantle layer is next.",
      },
      { type: "h2", text: "Why Mantle" },
      {
        type: "p",
        text: "Mantle is one of the few L2s with credible RWA infrastructure that is live today. USDY (Ondo Finance, around $29M on Mantle) pays T-bill yield through oracle price drift — not a staking reward, but actual T-bill exposure on-chain. mETH is Mantle native liquid staking. Aave v3 deployed on Mantle in its first month and crossed $1.25B TVL. The direct comparable is Mantle Vault (Bybit + Aave + CIAN) — automated yield management on-chain. DRIFT is the transparent, non-custodial version of that.",
      },
      { type: "h2", text: "What we built (and shelved)" },
      {
        type: "p",
        text: "The DRIP contracts exist, are tested (17 forge tests), and are not yet deployed. Three Mantle-specific components:",
      },
      {
        type: "ul",
        items: [
          "AgentController.sol — enforces rebalance bounds on-chain: max allocation per asset, turnover limit, correlation check, drawdown stop. Seven invariants (I1 through I7).",
          "Venue adapters — Aave v3 supply of USDY/USDC for yield; direct USDY holding for oracle-drift appreciation.",
          "DripVault.sol — ERC-4626 NAV accounting, non-custodial deposits.",
        ],
      },
      {
        type: "p",
        text: "None of that is in DRIFT today. The MVP is CeFi-only, in-memory, no persistence. But the architecture is compatible: the signal layer DRIFT runs on Bybit can be replicated as a signed intent that the on-chain AgentController validates before executing a venue-adapter rebalance.",
      },
      { type: "h2", text: "What is next" },
      {
        type: "p",
        text: "The roadmap: a strategy that routes idle capital into USDY yield while the bot is flat, managed by an on-chain risk guard that cannot be overridden by a dashboard toggle. The alpha is generated off-chain (Python, Bybit signals). The safety floor is on-chain (Mantle, AgentController). Neither can be gamed without changing both.",
      },
      {
        type: "blockquote",
        text: "A trading system whose risk controls live on-chain is categorically harder to manipulate than one that lives in a Python process. That is the thesis.",
      },
    ],
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug)
}
