"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { titleFor } from "./nav";

export function Topbar() {
  const pathname = usePathname();
  const title = titleFor(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0c0f]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/40">DRIFT</span>
          <span className="text-white/20">/</span>
          <span className="font-medium text-white">{title}</span>
        </div>

        <Link
          href="/"
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12.5px] text-white/45 transition hover:border-white/20 hover:text-white/75"
        >
          ← Home
        </Link>
      </div>
    </header>
  );
}
