"use client";

import { useRef } from "react";
import { useScrollProgress } from "./primitives";
import { EngravedSphere, EngravedDisc } from "./art";

const items = [
  {
    tag: "FINTECHS",
    title: "Infrastructure for innovation",
    body: "Power new products, rewards, and AI capabilities with a data foundation that scales.",
    art: "laptop",
  },
  {
    tag: "BANKS",
    title: "Clarity at enterprise scale",
    body: "Unify authorization, analytics, and AI on one trusted platform.",
    art: "sphere",
  },
  {
    tag: "AI",
    title: "AI that learns from the truth",
    body: "Feed your models clean, enriched data that makes intelligence actionable.",
    art: "disc",
  },
] as const;

function Laptop() {
  return (
    <svg viewBox="0 0 100 80" width={300} height={240} aria-hidden>
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth={0.5}
        transform="skewX(-12) translate(8 0)"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={i} x1={20} y1={10 + i * 2} x2={70} y2={10 + i * 2} />
        ))}
        <rect x={18} y={8} width={54} height={34} />
        <path d="M 12 44 L 78 44 L 84 56 L 6 56 Z" />
      </g>
    </svg>
  );
}

export default function BuiltFor() {
  const ref = useRef<HTMLDivElement>(null);
  const p = useScrollProgress(ref);
  const active = Math.min(items.length - 1, Math.floor(p * items.length));

  return (
    <section ref={ref} className="relative bg-white" style={{ height: "320vh" }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-6">
        <div className="mx-auto w-full max-w-[1180px]">
          <h2 className="text-center text-[clamp(2.2rem,6vw,4.6rem)] font-bold leading-[0.98] tracking-tight text-ink">
            Built for every layer
            <br />
            of modern finance
          </h2>

          <div className="relative mt-16 grid items-center gap-10 md:grid-cols-2">
            {/* cycling text */}
            <div className="relative h-44">
              {items.map((it, i) => (
                <div
                  key={it.tag}
                  className="absolute inset-0 max-w-sm transition-all duration-500"
                  style={{
                    opacity: i === active ? 1 : 0,
                    transform: `translateY(${i === active ? 0 : 16}px)`,
                  }}
                >
                  <div className="mb-3 border-t border-dashed border-ink/30 pt-3 font-mono text-[11px] tracking-widest text-ink/60">
                    ▶ [{it.tag}]
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-ink">
                    {it.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
                    {it.body}
                  </p>
                  <a
                    href="#"
                    className="mt-4 inline-flex items-center gap-2 font-mono text-sm text-ink"
                  >
                    ▸ Learn more
                  </a>
                </div>
              ))}
            </div>

            {/* cycling illustration */}
            <div className="relative flex h-64 items-center justify-center">
              {items.map((it, i) => (
                <div
                  key={it.tag}
                  className="absolute transition-all duration-500"
                  style={{
                    opacity: i === active ? 1 : 0,
                    transform: `scale(${i === active ? 1 : 0.85})`,
                  }}
                >
                  {it.art === "laptop" && <Laptop />}
                  {it.art === "sphere" && <EngravedSphere size={260} />}
                  {it.art === "disc" && <EngravedDisc size={280} />}
                </div>
              ))}
            </div>
          </div>

          {/* progress dots */}
          <div className="mt-10 flex justify-center gap-2">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-8 bg-ink" : "w-1.5 bg-ink/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
