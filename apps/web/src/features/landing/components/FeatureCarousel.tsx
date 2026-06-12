"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useScrollReveal";

function ReturnsVisual() {
  const bars = [
    { label: "MACD · momentum", w: "42%", strong: true },
    { label: "RSI · mean reversion", w: "64%" },
    { label: "Dual Thrust · breakout", w: "90%" },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-5 p-6">
      {bars.map((b) => (
        <div key={b.label}>
          <div className="mb-1.5 text-[11px] text-black/60">{b.label}</div>
          <div className="h-2.5 w-full rounded-full bg-black/10">
            <div className={`h-full rounded-full ${b.strong ? "bg-emerald-800/80" : "bg-emerald-900/30"}`} style={{ width: b.w }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GuardVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 p-6">
      <div className="self-end rounded-2xl rounded-br-md bg-white/85 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm">
        Drawdown just hit −20%?
      </div>
      <div className="rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm">
        Position flattened. Bot halted.
      </div>
      <div className="self-start rounded-md bg-black/10 px-2.5 py-1 font-mono text-[11px] text-gray-700">
        drawdown stop · enforced
      </div>
    </div>
  );
}

function SymbolsVisual() {
  const syms = ["BTC", "ETH", "SOL", "MNT", "XRP", "DOGE", "ARB", "OP"];
  return (
    <div className="relative flex h-full items-center justify-center p-6">
      <div className="grid grid-cols-4 gap-3 opacity-60">
        {syms.map((s, i) => (
          <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/30 font-mono text-[10px] font-semibold text-black/70">
            {s}
          </span>
        ))}
      </div>
      <span className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-black/60 font-mono text-xs font-bold text-white ring-4 ring-white/30">
        BTC
      </span>
    </div>
  );
}

function EquityVisual() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full rounded-xl border border-white/30 bg-black/20 p-4">
        <div className="mb-3 text-[10px] uppercase tracking-widest text-white/60">equity curve</div>
        <div className="flex h-20 items-end gap-1">
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} className="flex-1 rounded-sm bg-emerald-300/70" style={{ height: `${20 + ((i * 37) % 80)}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const cards = [
  {
    bg: "bg-gradient-to-br from-[#86efac] via-[#4ade80] to-[#16a34a]",
    visual: <ReturnsVisual />,
    tag: "Strategies",
    title: "MACD, RSI, Bollinger, Dual Thrust.",
    body: "Classic strategies ported from open research — each a few lines of readable signal logic.",
    href: "/dashboard",
  },
  {
    bg: "bg-gradient-to-br from-[#5eead4] via-[#2dd4bf] to-[#0d9488]",
    visual: <GuardVisual />,
    tag: "Risk",
    title: "A drawdown stop that can't be overridden.",
    body: "Position size and max-drawdown are enforced by the runner — it flattens and halts on breach.",
    href: "/dashboard/live",
  },
  {
    bg: "bg-gradient-to-br from-[#93c5fd] via-[#60a5fa] to-[#2563eb]",
    visual: <SymbolsVisual />,
    tag: "Backtest",
    title: "Point-in-time, no look-ahead.",
    body: "A signal on bar t only trades on bar t+1. The equity curve you see is the one you'd have earned.",
    href: "/dashboard",
  },
  {
    bg: "bg-gradient-to-br from-[#c4b5fd] via-[#a78bfa] to-[#7c3aed]",
    visual: <EquityVisual />,
    tag: "Live",
    title: "Real orders on Bybit testnet.",
    body: "Deploy a bot and watch fills and equity stream in over WebSockets, in real time.",
    href: "/dashboard/live",
  },
];

function Heading() {
  return (
    <div className="mx-auto max-w-2xl px-6 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Strategies built to be checked.</h2>
      <p className="mt-4 text-white/45">
        Honest, point-in-time backtests and bounded, on-the-record risk — every parameter visible, nothing fit in hindsight.
      </p>
    </div>
  );
}

function Card({ c }: { c: (typeof cards)[number] }) {
  return (
    <Link href={c.href} className="group block w-[300px] shrink-0 sm:w-[360px]">
      <div className={`h-60 overflow-hidden rounded-2xl ${c.bg} transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-black/40`}>
        {c.visual}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/45">{c.tag}</span>
        <span className="text-[11px] text-white/30 opacity-0 transition group-hover:opacity-100">Open →</span>
      </div>
      <h3 className="mt-2.5 text-base font-semibold text-white transition group-hover:text-[#cbd3ff]">{c.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/45">{c.body}</p>
    </Link>
  );
}

export function FeatureCarousel() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !sectionRef.current || !trackRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const track = trackRef.current;

    const ctx = gsap.context(() => {
      const distance = () => track.scrollWidth - window.innerWidth + 48;
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reduced]);

  if (reduced) {
    return (
      <section className="py-24">
        <Heading />
        <div className="mt-12 overflow-x-auto px-6">
          <div className="mx-auto flex max-w-[1180px] gap-5">
            {cards.map((c) => (
              <Card key={c.title} c={c} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative flex h-screen flex-col justify-center overflow-hidden">
      <Heading />
      <div
        ref={trackRef}
        className="mt-14 flex gap-5 will-change-transform"
        style={{ paddingLeft: "max(1.5rem, calc((100vw - 1180px) / 2))", paddingRight: "1.5rem" }}
      >
        {cards.map((c) => (
          <Card key={c.title} c={c} />
        ))}
      </div>
    </section>
  );
}
