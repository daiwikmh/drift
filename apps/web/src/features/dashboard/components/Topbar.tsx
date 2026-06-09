"use client";

import { usePathname } from "next/navigation";
import { titleFor } from "./nav";
import { WalletButton } from "./WalletButton";
import { Badge } from "./primitives";
import { BookIcon, HelpIcon } from "./icons";
import { activeChain } from "@/lib/wagmi";

export function Topbar() {
  const pathname = usePathname();
  const title = titleFor(pathname);
  const explorer = activeChain.blockExplorers?.default.url;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ink/8 bg-cream/80 px-5 backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs text-ink/40">DRIP</span>
        <span className="text-ink/30">/</span>
        <span className="font-semibold text-ink">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <Badge tone="lime" dot>
          {activeChain.name}
        </Badge>
        <div className="hidden items-center gap-1 sm:flex">
          {explorer && (
            <a
              href={explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink/50 hover:bg-ink/5 hover:text-ink"
              title="Block explorer"
            >
              <BookIcon />
            </a>
          )}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink/50 hover:bg-ink/5 hover:text-ink"
            title="Help"
          >
            <HelpIcon />
          </button>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
