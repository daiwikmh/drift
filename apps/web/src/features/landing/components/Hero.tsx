"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Container } from "./Container";
import { useReducedMotion } from "@/hooks/useScrollReveal";

const springConfig = { stiffness: 60, damping: 22, mass: 0.6 };

function Content() {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60 backdrop-blur-sm">
        Honest · Bounded · On the record
      </span>

      <h1 className="max-w-4xl text-5xl font-bold leading-[1.03] tracking-tight text-white sm:text-[68px]">
        Test it.  
        <br />
        Trust it.&apos;t.
        <br/>
        Trade.
      </h1>

      <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl">
        Transparent quant strategies on Bybit — with strictly point-in-time
        backtests and a risk stop that lives in code, not in a promise.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login" className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90">
          Open cockpit
        </Link>
        <a href="#strategies" className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:border-white/30">
          See the strategies
        </a>
      </div>
    </div>
  );
}

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"],
  });

  const contentY = useSpring(useTransform(scrollYProgress, [0, 0.7], [0, -100]), springConfig);
  const contentScale = useSpring(useTransform(scrollYProgress, [0, 0.7], [1, 0.95]), springConfig);
  const contentOpacity = useSpring(useTransform(scrollYProgress, [0, 0.6], [1, 0]), springConfig);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.15]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.4, 0.85]);
  const arrowOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  if (reduced) {
    return (
      <section className="relative flex h-screen items-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/hero-stars.jpg)" }} />
        <div className="absolute inset-0 bg-black/50" />
        <Container className="relative">
          <Content />
        </Container>
      </section>
    );
  }

  return (
    <div ref={heroRef} className="relative h-[200vh]">
      <section className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero-stars.jpg)", scale: bgScale }}
        />
        <motion.div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />

        <motion.div style={{ y: contentY, scale: contentScale, opacity: contentOpacity }} className="relative w-full">
          <Container>
            <Content />
          </Container>
        </motion.div>

        <motion.div
          style={{ opacity: arrowOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 animate-bounce">
            <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </section>
    </div>
  );
}
