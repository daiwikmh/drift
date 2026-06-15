"""DRIFT terminal — an immersive full-screen REPL over the same engine the web app uses.

Run via the repo-root launcher:  ./drift

It takes over the terminal's alternate screen (your shell is restored on exit) and
pins a `sys` header at the top and a status bar at the bottom using a DECSTBM scroll
region, so only the conversation in the middle scrolls. readline editing/history
work normally at the `>` prompt.

Commands:
    markets                              live prices
    chart  <sym> [tf]                    price chart
    backtest <strat> <sym> [tf]          point-in-time backtest
    research <sym> [tf]                  auto-research leaderboard (train/test)
    bot <strat> <sym> [tf] [qty] [dd]    live testnet bot (Ctrl-C to flatten)
    connect | status | help | clear | quit
"""
from __future__ import annotations

import shutil
import signal
import sys
import time
from typing import Optional

try:
    import readline  # noqa: F401 — enables line editing + history at the prompt
except ImportError:
    pass

from rich.console import Console, Group
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.text import Text
from rich import box

from .bybit_client import BybitClient
from .config import BYBIT_API_KEY, BYBIT_API_SECRET, BYBIT_TESTNET
from . import agent
from . import llm
from . import regime
from .backtester import run_backtest
from .chain import guard as chain_guard
from .telegram import tg
from .optimize import optimize as run_optimize
from .strategies.registry import all_strategies, get_strategy

console = Console()
ACCENT = "#9aa8f0"
UP = "#34d399"
DOWN = "#f87171"
AMBER = "#fbbf24"
GREY = "#9ca3af"
DIM = "#6b7280"
FAINT = "#4b5563"

MARKET_SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "MNTUSDT",
    "XRPUSDT", "DOGEUSDT", "BNBUSDT", "ARBUSDT",
]

# Assets whose live rate rides along the bottom status bar.
FOOTER_SYMS = ["BTC", "ETH", "SOL"]

_data = BybitClient(testnet=False)
_trade: Optional[BybitClient] = None
_testnet = BYBIT_TESTNET
_status = {"wallet": None, "tickers": {}, "bots": 0}


# ----------------------------------------------------------------- ansi ---

ESC = "\033"
RESET = f"{ESC}[0m"
ALT_ON = f"{ESC}[?1049h"
ALT_OFF = f"{ESC}[?1049l"


def rgb(hexs: str) -> str:
    h = hexs.lstrip("#")
    return f"{ESC}[38;2;{int(h[0:2],16)};{int(h[2:4],16)};{int(h[4:6],16)}m"


def _w(s: str) -> None:
    sys.stdout.write(s)


def size() -> tuple[int, int]:
    s = shutil.get_terminal_size((80, 24))
    return s.lines, s.columns


# --------------------------------------------------------------- chrome ---

def _visible_len(s: str) -> int:
    # length ignoring ANSI escape sequences
    out, i = 0, 0
    while i < len(s):
        if s[i] == "\033":
            while i < len(s) and s[i] != "m":
                i += 1
            i += 1
        else:
            out += 1
            i += 1
    return out


def _clip(s: str, cols: int) -> str:
    return s if _visible_len(s) <= cols else s  # short lines only; no truncation needed


def header_text() -> str:
    state = "connected" if _trade is not None else "no keys"
    net = "testnet" if _testnet else "mainnet"
    wal = f"  {rgb(FAINT)}·{RESET}  {rgb(DIM)}{_status['wallet']:.2f} USDT{RESET}" if _status["wallet"] is not None else ""
    return (
        f"{rgb(DIM)}sys{RESET}    {rgb(GREY)}{state} to bybit{RESET}"
        f"  {rgb(FAINT)}·{RESET}  {rgb(ACCENT)}{net}{RESET}{wal}"
    )


def status_text() -> str:
    net = "testnet" if _testnet else "mainnet"
    sep = f"  {rgb(FAINT)}·{RESET}  "
    parts = [f"{rgb(DIM)}agent{RESET} {rgb(ACCENT)}drift{RESET}", f"{rgb(AMBER)}{net}{RESET}"]
    if _status["wallet"] is not None:
        parts.append(f"{rgb(GREY)}wallet {_status['wallet']:.2f}{RESET}")
    for s in FOOTER_SYMS:
        t = _status["tickers"].get(s)
        if t:
            price, chg = t
            col = UP if chg >= 0 else DOWN
            arrow = "▲" if chg >= 0 else "▼"
            parts.append(f"{rgb(col)}{s} {arrow}{fmt(price)}{RESET}")
    parts.append(f"{rgb(GREY)}bots {_status['bots']}{RESET}")
    return "  " + sep.join(parts)


def draw_chrome() -> None:
    rows, _ = size()
    _w(f"{ESC}7")                       # save cursor
    _w(f"{ESC}[1;1H{ESC}[2K{header_text()}")
    _w(f"{ESC}[{rows};1H{ESC}[2K{status_text()}")
    _w(f"{ESC}8")                       # restore cursor
    sys.stdout.flush()


def setup_screen() -> None:
    rows, _ = size()
    _w(ALT_ON)
    _w(f"{ESC}[2J")                     # clear
    _w(f"{ESC}[2;{rows - 1}r")          # scroll region: rows 2..rows-1
    _w(f"{ESC}[2;1H")                   # cursor to top of region
    sys.stdout.flush()
    draw_chrome()


def teardown_screen() -> None:
    _w(f"{ESC}[r")                      # reset scroll region
    _w(ALT_OFF)
    sys.stdout.flush()


def on_resize(_sig=None, _frame=None) -> None:
    rows, _ = size()
    _w(f"{ESC}[2;{rows - 1}r")
    draw_chrome()
    sys.stdout.flush()


# ----------------------------------------------------------------- boot ---

DRIFT_ART = r"""
██████╗ ██████╗ ██╗███████╗████████╗
██╔══██╗██╔══██╗██║██╔════╝╚══██╔══╝
██║  ██║██████╔╝██║█████╗     ██║
██║  ██║██╔══██╗██║██╔══╝     ██║
██████╔╝██║  ██║██║██║        ██║
╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝
""".strip("\n").split("\n")


def _progress(width: int = 30, frames: int = 16) -> None:
    """A self-filling bar on one line (carriage-return animation)."""
    for i in range(frames + 1):
        f = int(i / frames * width)
        bar = "█" * f + "·" * (width - f)
        _w(f"\r  {rgb(ACCENT)}{bar}{RESET}  {rgb(DIM)}{int(i / frames * 100):3d}%{RESET}")
        sys.stdout.flush()
        time.sleep(0.025)
    _w("\n")
    sys.stdout.flush()


def _step(label: str, detail: str, ok: bool = True, delay: float = 0.11) -> None:
    mark = f"{rgb(UP)}✓{RESET}" if ok else f"{rgb(AMBER)}✗{RESET}"
    bar = f"{rgb(FAINT)}│{RESET}"
    diamond = f"{rgb(ACCENT)}◇{RESET}"
    _w(f"  {diamond} {rgb(GREY)}{label:<13}{RESET}{bar}  {rgb(DIM)}{detail}{RESET}  {mark}\n")
    sys.stdout.flush()
    time.sleep(delay)


def boot() -> None:
    """Animated init: the agent wakes up and runs its own preflight on screen."""
    _w("\n")
    for ln in DRIFT_ART:
        _w(f"   {rgb(ACCENT)}{ln}{RESET}\n")
        sys.stdout.flush()
        time.sleep(0.045)
    _w(
        f"   {rgb(DIM)}autonomous quant agent{RESET}"
        f"  {rgb(FAINT)}·{RESET}  {rgb(GREY)}bybit{RESET} {rgb(FAINT)}×{RESET} {rgb(GREY)}mantle{RESET}\n\n"
    )
    sys.stdout.flush()
    time.sleep(0.12)

    _w(f"{rgb(DIM)}> drift init{RESET}\n")
    sys.stdout.flush()
    _progress()

    _step("engine", "strategies · optimizer · backtester")
    _step("market data", "bybit public feed")

    has_key, has_sec = bool(BYBIT_API_KEY), bool(BYBIT_API_SECRET)
    _step("bybit key", "configured" if has_key else "missing — set BYBIT_API_KEY", ok=has_key)
    _step("bybit secret", "configured" if has_sec else "missing — set BYBIT_API_SECRET", ok=has_sec)
    _step(
        "agent api",
        f"{llm.provider()} · {llm.model()}" if llm.is_enabled() else "missing — no LLM key",
        ok=llm.is_enabled(),
    )
    if chain_guard.enabled and chain_guard.address:
        a = chain_guard.address
        _step("macroguard", f"mantle sepolia · {a[:6]}…{a[-4:]}")
    _step(
        "telegram",
        f"@{tg.username or 'bot'} · alerts on" if tg.is_enabled() else "off — connect with `telegram`",
        ok=tg.is_enabled(),
    )
    if _trade is not None and _status["wallet"] is not None:
        net = "testnet" if _testnet else "mainnet"
        _step("account", f"{_status['wallet']:.2f} USDT · {net}")

    _w(
        f"  {rgb(UP)}✓ ready{RESET}  {rgb(DIM)}— just talk to me ({RESET}{rgb(ACCENT)}how's btc?{RESET}"
        f"{rgb(DIM)}) or type a command:{RESET} {rgb(ACCENT)}markets{RESET}{rgb(DIM)},{RESET} "
        f"{rgb(ACCENT)}help{RESET}\n\n"
    )
    sys.stdout.flush()


# --------------------------------------------------------------- helpers --

_BARS = "▁▂▃▄▅▆▇█"


def sparkline(vals: list[float]) -> str:
    if len(vals) < 2:
        return ""
    lo, hi = min(vals), max(vals)
    rng = hi - lo or 1
    return "".join(_BARS[min(7, int((v - lo) / rng * 7))] for v in vals)


def line_chart(vals: list[float], width: int = 72, height: int = 12, color: str = ACCENT) -> Text:
    if len(vals) < 2:
        return Text("no data", style="dim")
    n = len(vals)
    cols = [vals[int(x / (width - 1) * (n - 1))] for x in range(width)]
    lo, hi = min(cols), max(cols)
    rng = hi - lo or 1
    out = Text()
    for r in range(height):
        thi = 1 - r / height
        tlo = 1 - (r + 1) / height
        for v in cols:
            f = (v - lo) / rng
            out.append("█" if f >= thi else "▄" if f > tlo else " ", style=color)
        if r < height - 1:
            out.append("\n")
    return out


def fmt(v: float) -> str:
    if v >= 1000:
        return f"{v:,.0f}"
    if v >= 1:
        return f"{v:.2f}"
    return f"{v:.5g}"


def pct(v: float) -> str:
    return f"{v * 100:+.2f}%"


_TF_ALIASES: dict[str, str] = {
    # bare numbers: 1/2/4/6/12 → hours; 3/5/15/30 → minutes
    "1": "1h", "2": "2h", "4": "4h", "6": "6h", "12": "12h",
    "3": "3m", "5": "5m", "15": "15m", "30": "30m",
    # hr/hour suffixes
    "1hr": "1h", "2hr": "2h", "4hr": "4h", "6hr": "6h", "12hr": "12h",
    "1hour": "1h", "4hour": "4h",
    # min suffixes
    "1min": "1m", "3min": "3m", "5min": "5m", "15min": "15m", "30min": "30m",
    # words
    "day": "1d", "daily": "1d", "week": "1w", "weekly": "1w",
}

def resolve_tf(s: str) -> Optional[str]:
    from .config import TIMEFRAMES
    s = s.lower().strip()
    if s in TIMEFRAMES:
        return s
    return _TF_ALIASES.get(s)


def resolve_sym(s: str) -> str:
    s = s.upper()
    return s if "USDT" in s else s + "USDT"


def resolve_strategy(s: str) -> Optional[str]:
    ids = [c.id for c in all_strategies()]
    s = s.lower()
    if s in ids:
        return s
    m = [i for i in ids if i.startswith(s)]
    return m[0] if len(m) == 1 else None


def _stat(label: str, value: str, color: str = "white") -> Panel:
    t = Text()
    t.append(label + "\n", style="dim")
    t.append(value, style=f"bold {color}")
    return Panel(t, box=box.MINIMAL, padding=(0, 1))


def _sign(x: float) -> int:
    return 1 if x > 0 else -1 if x < 0 else 0


def err(msg: str) -> None:
    console.print(f"[{DOWN}]error[/] [dim]·[/] {msg}")


# ------------------------------------------------------------ connection --

def connect_from_env() -> None:
    global _trade
    if BYBIT_API_KEY and BYBIT_API_SECRET:
        try:
            c = BybitClient(api_key=BYBIT_API_KEY, api_secret=BYBIT_API_SECRET, testnet=_testnet)
            _status["wallet"] = c.wallet_balance()
            _trade = c
        except Exception:
            pass


def refresh_footer_price() -> None:
    try:
        tk = _data.tickers()
        for s in FOOTER_SYMS:
            r = tk.get(s + "USDT")
            if r:
                _status["tickers"][s] = (float(r["lastPrice"]), float(r["price24hPcnt"]))
    except Exception:
        pass


# ------------------------------------------------------------- commands ---

def cmd_help() -> None:
    t = Table(box=box.SIMPLE, show_header=False, pad_edge=False)
    t.add_column(style=f"bold {ACCENT}")
    t.add_column(style="dim")
    t.add_row("markets", "live prices across tracked symbols")
    t.add_row("chart <sym> [tf]", "price chart, e.g. chart eth 4h")
    t.add_row("strategies", "explain all trading strategies")
    t.add_row("backtest <strat> <sym> [tf]", "backtest, e.g. backtest macd btc 1h")
    t.add_row("research <sym> [tf]", "auto-research leaderboard (train/test)")
    t.add_row("analyze <sym>", "AI analyst rationale over the live regime")
    t.add_row("bot <strat> <sym> [tf] [qty] [dd]", "run a live testnet bot")
    t.add_row("connect / status", "set or show Bybit connection")
    t.add_row("chain", "show the on-chain MacroGuard (Mantle)")
    t.add_row("telegram [connect|test]", "connect Telegram alerts + control bot")
    t.add_row("clear / quit", "clear screen · exit")
    console.print(t)


def cmd_strategies() -> None:
    t = Table(box=box.SIMPLE_HEAVY, title="available strategies", title_style=f"bold {ACCENT}")
    t.add_column("id", style=f"bold {ACCENT}", no_wrap=True)
    t.add_column("type", style="dim", no_wrap=True)
    t.add_column("what it does")
    t.add_column("defaults", style="dim")
    for s in all_strategies():
        defaults = "  ".join(f"{p.key}={p.default:g}" for p in s.param_specs)
        t.add_row(s.id, s.type, s.blurb, defaults)
    console.print(t)
    console.print(
        f"[dim]try:[/] [bold {ACCENT}]backtest macd btc 1h[/]  [dim]or let the optimizer pick:[/]  "
        f"[bold {ACCENT}]research btc 1h[/]"
    )


def cmd_markets() -> None:
    with console.status("fetching markets…", spinner="line"):
        try:
            tk = _data.tickers()
        except Exception as e:
            return err(str(e))
    t = Table(box=box.SIMPLE_HEAVY)
    t.add_column("symbol", style="bold")
    t.add_column("last", justify="right")
    t.add_column("24h", justify="right")
    t.add_column("range", style="dim")
    for s in MARKET_SYMBOLS:
        r = tk.get(s)
        if not r:
            continue
        chg = float(r["price24hPcnt"])
        t.add_row(
            s.replace("USDT", "/USDT"),
            fmt(float(r["lastPrice"])),
            Text(pct(chg), style=UP if chg >= 0 else DOWN),
            f"{fmt(float(r['lowPrice24h']))} – {fmt(float(r['highPrice24h']))}",
        )
    console.print(t)
    refresh_footer_price()


def _resolve_tf_or_err(raw: str) -> Optional[str]:
    tf = resolve_tf(raw)
    if tf is None:
        from .config import TIMEFRAMES
        err(f"unsupported timeframe '{raw}' — valid: {', '.join(TIMEFRAMES)}")
    return tf


def cmd_chart(sym: str, tf: str = "1h") -> None:
    tf = _resolve_tf_or_err(tf)
    if tf is None:
        return
    sym = resolve_sym(sym)
    with console.status("fetching candles…", spinner="line"):
        try:
            df = _data.klines(sym, tf, 120)
        except Exception as e:
            return err(str(e))
    closes = df["close"].tolist()
    col = UP if closes[-1] >= closes[0] else DOWN
    sub = Text(f"{fmt(min(closes))} – {fmt(max(closes))}   last {fmt(closes[-1])}", style="dim")
    console.print(Panel(Group(line_chart(closes, color=col), sub), title=f"{sym} · {tf}", border_style=col, box=box.ROUNDED))


def cmd_backtest(strat: str, sym: str, tf: str = "1h") -> None:
    sid = resolve_strategy(strat)
    if not sid:
        return err(f"unknown strategy '{strat}' — try: {', '.join(c.id for c in all_strategies())}")
    tf = _resolve_tf_or_err(tf)
    if tf is None:
        return
    sym = resolve_sym(sym)
    with console.status("running backtest…", spinner="line"):
        try:
            df = _data.klines(sym, tf, 720)
        except Exception as e:
            return err(str(e))
        res = run_backtest(get_strategy(sid), df, sym, tf)
    m = res.metrics
    col = UP if m.total_return >= 0 else DOWN
    grid = Table.grid(expand=True)
    for _ in range(5):
        grid.add_column()
    grid.add_row(
        _stat("return", pct(m.total_return), col),
        _stat("sharpe", f"{m.sharpe:.2f}", UP if m.sharpe >= 0 else DOWN),
        _stat("win rate", f"{m.win_rate*100:.0f}%"),
        _stat("max dd", pct(m.max_drawdown), DOWN),
        _stat("trades", str(m.num_trades)),
    )
    eq = [p.equity for p in res.equity_curve]
    console.print(Panel(Group(grid, Text(""), line_chart(eq, color=col)),
                        title=f"backtest · {res.strategy} · {sym} {tf}", border_style=col, box=box.ROUNDED))


def cmd_research(sym: str, tf: str = "1h") -> None:
    tf = _resolve_tf_or_err(tf)
    if tf is None:
        return
    sym = resolve_sym(sym)
    with console.status("sweeping parameter space · train/test split…", spinner="line"):
        try:
            df = _data.klines(sym, tf, 1000)
        except Exception as e:
            return err(str(e))
        res = run_optimize(df, sym, tf, 0.7)
    vstyle = {"robust": UP, "overfit": AMBER, "weak": "dim"}
    t = Table(box=box.SIMPLE_HEAVY, title=f"auto-research · {sym} {tf} · optimised 70% / tested 30%")
    t.add_column("#"); t.add_column("strategy", style="bold"); t.add_column("params", style="dim")
    t.add_column("IS", justify="right"); t.add_column("OOS", justify="right")
    t.add_column("OOS ret", justify="right"); t.add_column("verdict")
    for i, r in enumerate(res.results, 1):
        oc = UP if r.out_of_sample.sharpe >= 0 else DOWN
        t.add_row(
            str(i), r.name, " ".join(f"{k}={v:g}" for k, v in r.params.items()),
            Text(f"{r.in_sample.sharpe:.2f}", style="dim"),
            Text(f"{r.out_of_sample.sharpe:.2f}", style=oc),
            Text(pct(r.out_of_sample.total_return), style=oc),
            Text(r.verdict, style=vstyle.get(r.verdict, "white")),
        )
    console.print(t)
    if res.results:
        best = res.results[0]
        console.print(f"[dim]› deploy the winner:[/] [bold {ACCENT}]bot {best.strategy} {sym.replace('USDT','').lower()} {tf}[/]")


# ------------------------------------------------------------- live bot ---

def cmd_bot(strat: str, sym: str, tf: str = "1h", qty: float = 0.001, max_dd: float = 0.2, poll: int = 15) -> None:
    if _trade is None:
        return err("not connected — run [bold]connect[/] first.")
    sid = resolve_strategy(strat)
    if not sid:
        return err(f"unknown strategy '{strat}'")
    tf = _resolve_tf_or_err(tf)
    if tf is None:
        return
    sym = resolve_sym(sym)
    strat_obj = get_strategy(sid)
    try:
        equity = _trade.account_equity()
        peak = equity
        position = _sign(_trade.position_size(sym))
    except Exception as e:
        return err(str(e))

    fills: list[dict] = []
    error: Optional[str] = None
    last_price = 0.0
    signal_name = "—"
    chain_tx: Optional[str] = None
    console.print(f"[dim]bot live · {sym} {tf} · qty {qty} · Ctrl-C to stop & flatten[/]")

    def render() -> Panel:
        g = Table.grid(expand=True)
        for _ in range(4):
            g.add_column()
        dd = equity / peak - 1 if peak else 0
        posname = "long" if position > 0 else "short" if position < 0 else "flat"
        g.add_row(
            _stat("equity", f"{equity:.2f}"),
            _stat("drawdown", pct(dd), DOWN if dd < 0 else "white"),
            _stat("position", posname, UP if position > 0 else DOWN if position < 0 else "white"),
            _stat("signal", signal_name, UP if signal_name == "long" else DOWN if signal_name == "short" else "white"),
        )
        lines = [g, Text(f"last {fmt(last_price)}", style="dim")]
        if chain_guard.enabled:
            chain_line = f"⛓ macroguard {chain_guard.address[:10]}…"
            if chain_tx:
                chain_line += f" · logged {chain_tx[:10]}…"
            lines.append(Text(chain_line, style=ACCENT))
        if error:
            if "10005" in error or "permission" in error.lower():
                lines.append(Text("bybit keys are read-only — live orders need trade permission + funds.", style=AMBER))
            else:
                lines.append(Text(error, style=DOWN))
        if fills:
            ft = Table(box=box.SIMPLE, show_header=False)
            for f in fills[-5:]:
                ft.add_row(Text(f"{f['side']} {f['qty']}", style=UP if f["side"] == "Buy" else DOWN), fmt(f["price"]))
            lines.append(ft)
        return Panel(Group(*lines), title=f"● {sym} · {sid}", border_style=ACCENT, box=box.ROUNDED)

    _status["bots"] += 1
    draw_chrome()
    try:
        with Live(render(), console=console, refresh_per_second=4) as live:
            while True:
                df = _data.klines(sym, tf, 200)
                target = int(strat_obj.positions(df).iloc[-1])
                last_price = float(df["close"].iloc[-1])
                signal_name = {1: "long", -1: "short", 0: "flat"}[target]
                # On-chain macro guard: a risk-off regime or active halt vetoes
                # the signal — clamp to flat (de-risk), enforced on-chain.
                vetoed = not chain_guard.allowed(target)
                if vetoed:
                    target = 0
                if target != position:
                    side = "Buy" if target > position else "Sell"
                    q = round(qty * abs(target - position), 8)
                    try:
                        _trade.place_market_order(sym, side, q)
                        fills.append({"side": side, "qty": q, "price": last_price})
                        position = target
                        error = None
                        tg.send(f"🟢 *Fill* {sym}\n{side} {q} @ {last_price:,.2f} → {signal_name}")
                    except Exception as e:
                        error = str(e)
                try:
                    equity = _trade.account_equity()
                    peak = max(peak, equity)
                except Exception:
                    pass
                # Record this decision on-chain (best-effort) — the benchmark trail.
                tx = chain_guard.record(sym, target, last_price, equity / peak - 1 if peak else 0)
                if tx:
                    chain_tx = tx
                live.update(render())
                if peak and equity / peak - 1 <= -max_dd:
                    error = f"drawdown stop hit ({equity/peak-1:.2%})"
                    tg.send(f"🛑 *Drawdown stop* {sym}\ndd {equity/peak-1:.2%} · flattening.")
                    live.update(render())
                    break
                time.sleep(poll)
    except KeyboardInterrupt:
        pass
    finally:
        _status["bots"] = max(0, _status["bots"] - 1)
        if position != 0:
            try:
                _trade.place_market_order(sym, "Sell" if position > 0 else "Buy", round(qty * abs(position), 8))
                console.print("[dim]position flattened.[/]")
            except Exception:
                pass
        console.print("[dim]bot stopped.[/]")
        draw_chrome()


def cmd_connect() -> None:
    global _trade, _testnet
    import getpass
    try:
        key = input("api key › ").strip()
        if not key:
            return
        sec = getpass.getpass("api secret › ").strip()
        net = (input("network [testnet/mainnet] › ").strip() or "testnet").lower()
    except (EOFError, KeyboardInterrupt):
        console.print("[dim]cancelled.[/]")
        return
    _testnet = net != "mainnet"
    try:
        c = BybitClient(api_key=key, api_secret=sec, testnet=_testnet)
        _status["wallet"] = c.wallet_balance()
        _trade = c
        console.print(f"[{UP}]connected · {net} · {_status['wallet']:.2f} USDT[/]")
    except Exception as e:
        err(str(e))


def cmd_status() -> None:
    if _trade is None:
        console.print(f"[{AMBER}]not connected[/] [dim]· set keys with[/] [bold]connect[/]")
        return
    try:
        bal = _trade.wallet_balance()
        _status["wallet"] = bal
        console.print(f"[{UP}]connected[/] [dim]·[/] {'testnet' if _testnet else 'mainnet'} [dim]·[/] {bal:.2f} USDT")
    except Exception as e:
        err(str(e))


def cmd_chain() -> None:
    info = chain_guard.info()
    if not info["enabled"]:
        console.print(f"[{AMBER}]on-chain guard off[/] [dim]· set MACROGUARD_ADDRESS + ETH_PRIVATE_KEY[/]")
        return
    console.print(f"[{UP}]macroguard live[/] [dim]·[/] chain {info['chain_id']}")
    console.print(f"[dim]contract[/] {info['address']}")
    console.print(f"[dim]explorer[/] [{ACCENT}]{info['explorer']}[/]")
    try:
        reg = regime.current(_data)
        tone = UP if reg.label == "risk-on" else DOWN if reg.label == "risk-off" else GREY
        console.print(f"[dim]regime[/]   [{tone}]{reg.label}[/] [dim]· vol_z {reg.vol_z:+.2f} · trend {reg.trend:+.4f}[/]")
    except Exception:
        pass


def cmd_telegram(args: list[str]) -> None:
    sub = args[0].lower() if args else "status"
    if sub == "connect":
        if len(args) < 2:
            return err("usage: telegram connect <bot_token> [chat_id]")
        try:
            name = tg.configure(args[1], args[2] if len(args) > 2 else None)
        except Exception as e:
            return err(str(e))
        console.print(f"[{UP}]bot @{name} verified[/]")
        if not tg.chat_id:
            console.print("[dim]now message your bot[/] [bold]/start[/] [dim]to bind this chat for alerts.[/]")
    elif sub == "test":
        if not tg.is_enabled():
            return err("not connected — telegram connect <token> <chat_id>")
        console.print(f"[{UP}]sent[/]" if tg.send("✅ DRIFT test alert.") else f"[{DOWN}]send failed — check chat_id[/]")
    else:  # status
        i = tg.info()
        if i["enabled"]:
            console.print(f"[{UP}]telegram on[/] [dim]· @{i['username'] or 'bot'} · chat {i['chat_id']}[/]")
        elif i["configured"]:
            console.print(f"[{AMBER}]token set, no chat[/] [dim]· message the bot[/] [bold]/start[/]")
        else:
            console.print(f"[{AMBER}]telegram off[/] [dim]· telegram connect <bot_token> [chat_id][/]")


# ------------------------------------------------------------ agent chat --

_agent_history: list[dict] = []


def _agent_exec(name: str, args: dict) -> str:
    """Run an agent tool against real data and return a compact text result."""
    trace = " ".join(f"{k}={v}" for k, v in args.items())
    console.print(f"[{FAINT}]⚙ {name}{(' ' + trace) if trace else ''}[/]")
    try:
        if name == "get_markets":
            tk = _data.tickers()
            rows = []
            for s in MARKET_SYMBOLS[:6]:
                r = tk.get(s)
                if r:
                    rows.append(f"{s} {float(r['lastPrice']):,.2f} ({float(r['price24hPcnt'])*100:+.2f}%)")
            return "\n".join(rows) or "no market data"
        if name == "get_market":
            sym = resolve_sym(args.get("symbol", ""))
            r = _data.tickers().get(sym)
            if not r:
                return f"no data for {sym}"
            return (
                f"{sym} last {float(r['lastPrice']):,.2f} · 24h {float(r['price24hPcnt'])*100:+.2f}% "
                f"· range {float(r['lowPrice24h']):,.2f}–{float(r['highPrice24h']):,.2f}"
            )
        if name == "get_regime":
            g = regime.current(_data)
            return f"regime {g.label} · vol_z {g.vol_z:+.2f} · trend {g.trend:+.4f} · BTC {g.price:,.2f}"
        if name == "run_backtest":
            sid = resolve_strategy(args.get("strategy", ""))
            if not sid:
                return f"unknown strategy '{args.get('strategy')}' (have: macd, rsi, bollinger, dualthrust)"
            sym = resolve_sym(args.get("symbol", "BTC"))
            tf = args.get("timeframe") or "1h"
            res = run_backtest(get_strategy(sid), _data.klines(sym, tf, 720), sym, tf)
            m = res.metrics
            return (
                f"{sid} {sym} {tf} → return {m.total_return*100:+.1f}% · sharpe {m.sharpe:.2f} "
                f"· win {m.win_rate*100:.0f}% · maxDD {m.max_drawdown*100:.1f}% · {m.num_trades} trades"
            )
        if name == "get_chain":
            i = chain_guard.info()
            return f"macroguard {i['address']} · chain {i['chain_id']}" if i["enabled"] else "macroguard off"
        return f"unknown tool {name}"
    except Exception as e:
        return f"tool error: {e}"


def cmd_agent(text: str) -> None:
    if not llm.is_enabled():
        return err("agent needs an LLM key — set one or restart to be prompted")
    try:
        reply = agent.run(text, _agent_history, _agent_exec)
    except Exception as e:
        return err(str(e))
    console.print(f"[bold {ACCENT}]drift[/] [dim]›[/] {reply}")


def cmd_analyze(sym: str) -> None:
    if not llm.is_enabled():
        return err("LLM analyst off — set OPENROUTER_API_KEY or NVIDIA_API_KEY")
    sym = resolve_sym(sym)
    try:
        reg = regime.current(_data)
    except Exception as e:
        return err(str(e))
    tone = UP if reg.label == "risk-on" else DOWN if reg.label == "risk-off" else GREY
    console.print(f"[dim]analysing[/] [bold]{sym}[/] [dim]· regime[/] [{tone}]{reg.label}[/]")
    in_reasoning = False
    try:
        for kind, text in llm.stream(sym, reg):
            if kind == "reasoning":
                if not in_reasoning:
                    console.print("[dim italic]thinking…[/]")
                    in_reasoning = True
                console.print(f"[dim]{text}[/]", end="")
            else:
                if in_reasoning:
                    console.print()
                    in_reasoning = False
                console.print(text, end="")
        console.print()
    except Exception as e:
        err(str(e))


# ------------------------------------------------------------------ repl --

PROMPT = f"\001{rgb(ACCENT)}\002> \001{RESET}\002"


def dispatch(line: str) -> bool:
    parts = line.split()
    if not parts:
        return True
    cmd, args = parts[0].lower(), parts[1:]
    if cmd in ("quit", "exit", "q"):
        return False
    if cmd in ("help", "?"):
        cmd_help()
    elif cmd == "clear":
        rows, _ = size()
        _w(f"{ESC}[2;{rows - 1}r{ESC}[2J{ESC}[2;1H")
        sys.stdout.flush()
        draw_chrome()
    elif cmd == "markets":
        cmd_markets()
    elif cmd == "strategies":
        cmd_strategies()
    elif cmd == "chart" and args:
        cmd_chart(*args[:2])
    elif cmd == "backtest" and len(args) >= 2:
        cmd_backtest(args[0], args[1], args[2] if len(args) > 2 else "1h")
    elif cmd == "research" and args:
        cmd_research(args[0], args[1] if len(args) > 1 else "1h")
    elif cmd == "bot" and len(args) >= 2:
        cmd_bot(
            args[0], args[1],
            args[2] if len(args) > 2 else "1h",
            float(args[3]) if len(args) > 3 else 0.001,
            float(args[4]) if len(args) > 4 else 0.2,
        )
    elif cmd == "connect":
        cmd_connect()
    elif cmd in ("status", "connection"):
        cmd_status()
    elif cmd == "chain":
        cmd_chain()
    elif cmd == "analyze" and args:
        cmd_analyze(args[0])
    elif cmd == "telegram":
        cmd_telegram(args)
    else:
        cmd_agent(line)  # natural language → the agent
    return True


def ensure_llm() -> None:
    """The agent's analyst is required: prompt for a key before the REPL opens.
    Silent when a key is already set — the boot sequence reports it."""
    if llm.is_enabled():
        return
    console.print(f"[{ACCENT}]An LLM API key is required to start the agent.[/]")
    console.print("[dim]Paste an OpenRouter ([/]sk-or-…[dim]) or NVIDIA ([/]nvapi-…[dim]) key · get one at openrouter.ai/keys[/]")
    try:
        key = input("LLM API key: ").strip()
    except (EOFError, KeyboardInterrupt):
        key = ""
    if not key:
        console.print(f"[{DOWN}]No key provided — exiting.[/]")
        raise SystemExit(1)
    llm.configure(key)
    console.print(f"[{UP}]analyst ready[/] [dim]· {llm.provider()} · {llm.model()}[/]")


def main() -> None:
    connect_from_env()
    ensure_llm()
    refresh_footer_price()
    if hasattr(signal, "SIGWINCH"):
        signal.signal(signal.SIGWINCH, on_resize)
    setup_screen()
    boot()
    try:
        while True:
            draw_chrome()
            try:
                line = input(PROMPT)
            except KeyboardInterrupt:
                console.print()
                continue
            except EOFError:
                break
            if not dispatch(line.strip()):
                break
    finally:
        teardown_screen()
        console.print("[dim]bye.[/]")


if __name__ == "__main__":
    main()
