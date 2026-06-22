"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Container } from "./Container";
import { useReducedMotion } from "@/hooks/useScrollReveal";

const spring = { stiffness: 60, damping: 22, mass: 0.6 };

function Backdrop() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 50% 8%, rgba(154,168,240,0.18), transparent 60%), radial-gradient(700px 500px at 82% 30%, rgba(232,65,66,0.10), transparent 60%), linear-gradient(180deg, #070809 0%, #06070c 60%, #070809 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black, transparent 75%)",
        }}
      />
    </>
  );
}

function Content() {
  return (
    <div className="relative flex flex-col items-center text-center">
      <span className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[#9aa8f0] shadow-[0_0_8px_#9aa8f0]" />
        AVAX
        <span className="text-white/25">·</span>
        x402
        <span className="text-white/25">·</span>
        ERC-8004
      </span>

      <h1 className="max-w-4xl font-display text-5xl leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.7)] sm:text-[76px]">
        Compute, paid per call.
        <br />
        Between{" "}
        <span className="bg-gradient-to-r from-[#cbd3ff] via-[#9aa8f0] to-[#a78bfa] bg-clip-text text-transparent">
          agents
        </span>
        .
      </h1>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[13px] uppercase tracking-wide text-white/70">
        <span>Discover by reputation</span>
        <span className="text-[#9aa8f0]">/</span>
        <span>Pay native AVAX</span>
        <span className="text-[#9aa8f0]">/</span>
        <span className="text-white/90">Unlock the inference</span>
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Open the marketplace
        </Link>
        <Link
          href="#how"
          className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:border-white/30"
        >
          How it works
        </Link>
      </div>
    </div>
  );
}

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const contentY = useSpring(useTransform(scrollYProgress, [0, 0.7], [0, -100]), spring);
  const contentOpacity = useSpring(useTransform(scrollYProgress, [0, 0.6], [1, 0]), spring);

  if (reduced) {
    return (
      <section className="relative flex h-screen items-center overflow-hidden">
        <Backdrop />
        <Container className="relative">
          <Content />
        </Container>
      </section>
    );
  }

  return (
    <div ref={heroRef} className="relative h-[180vh]">
      <section className="sticky top-0 flex h-screen items-center overflow-hidden">
        <Backdrop />
        <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative w-full">
          <Container>
            <Content />
          </Container>
        </motion.div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 animate-bounce">
            <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>
    </div>
  );
}
