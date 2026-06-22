import Link from "next/link";
import { site } from "@/lib/site";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Marketplace", href: "/dashboard" },
      { label: "Become a provider", href: "/dashboard/serve" },
    ],
  },
  {
    heading: "Standards",
    links: [
      { label: "ERC-8004", href: "https://eips.ethereum.org/EIPS/eip-8004" },
      { label: "x402", href: "https://www.x402.org" },
    ],
  },
  {
    heading: "Network",
    links: [
      { label: "Avalanche Fuji", href: "https://testnet.snowtrace.io" },
      { label: "Faucet", href: "https://core.app/tools/testnet-faucet/" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden border-t border-white/10"
      style={{ background: "linear-gradient(135deg, #070809 0%, #0a1428 50%, #051030 100%)" }}
    >
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(ellipse at center, rgba(154,168,240,0.25), transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-0">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-0">
          <div className="flex flex-col gap-8 lg:w-[45%] lg:pr-16">
            <p className="text-4xl font-semibold leading-tight text-white md:text-5xl">{site.tagline}</p>
            <Link
              href="/dashboard"
              className="w-fit rounded-full bg-[#9aa8f0] px-5 py-2.5 text-sm font-medium text-[#14152b] transition hover:bg-[#aeb9f4]"
            >
              Open the marketplace
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 lg:flex-1">
            {columns.map((col) => (
              <div key={col.heading}>
                <h4 className="inline-block rounded border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                  {col.heading}
                </h4>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white"
                      >
                        <span className="h-px w-0 bg-[#9aa8f0] transition-all duration-200 group-hover:w-3" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-white/10" />

        <div className="relative -mx-6 overflow-hidden">
          <p
            className="select-none bg-gradient-to-b from-[#9aa8f0] to-[#9aa8f0]/10 bg-clip-text text-center font-bold leading-none tracking-tight text-transparent"
            style={{ fontSize: "clamp(80px, 18vw, 260px)", fontFamily: "var(--font-playfair)" }}
          >
            DRIFT
          </p>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center justify-between text-xs text-white/30">
          <span>© {new Date().getFullYear()} DRIFT · testnet only — balances are not real funds.</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e84142]" />
            Built on Avalanche
          </span>
        </div>
      </div>
    </footer>
  );
}
