"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const links = [
  { label: "Solutions", caret: true },
  { label: "Customers", caret: false },
  { label: "Company", caret: true },
  { label: "Docs", caret: false },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-black/10 bg-white/85 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <a href="#" className="text-2xl font-extrabold tracking-tight text-ink">
          SPADE<sup className="top-[-0.5em] text-sm">&apos;</sup>
        </a>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 text-[15px] font-medium text-ink md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a href="#" className="flex items-center gap-1 hover:opacity-60">
                {l.label}
                {l.caret && <span className="text-[10px]">▾</span>}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden rounded-md border border-black/10 bg-zinc-100 px-4 py-2 text-sm font-medium text-ink transition hover:bg-zinc-200 sm:inline-block"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-lime transition hover:bg-ink-soft"
          >
            Open app
          </Link>
        </div>
      </nav>
    </header>
  );
}
