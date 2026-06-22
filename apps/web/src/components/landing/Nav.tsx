"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "./Container";
import { site } from "@/lib/site";

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <Image src="/logo.png" alt="DRIFT" width={28} height={28} priority className="h-7 w-7 object-contain" />
      <span className="text-[17px] font-semibold tracking-tight">DRIFT</span>
    </span>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-white/10 bg-black/70 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <Container className="flex h-[60px] items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {site.nav.map((l, i) => (
              <Link
                key={l.label}
                href={l.href}
                className={`text-[15px] font-medium transition-colors hover:text-white ${i === 0 ? "text-white/80" : "text-white/45"}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/55 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e84142]" />
            Avalanche Fuji
          </span>
          <Link
            href="/dashboard"
            className="rounded-full bg-[#9aa8f0] px-4 py-1.5 text-[13px] font-medium text-[#14152b] transition hover:bg-[#aeb9f4]"
          >
            Open app
          </Link>
        </div>
      </Container>
    </header>
  );
}
