import Link from "next/link";
import { Container } from "./Container";
import { site } from "../site";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-16">
      <Container className="flex flex-col gap-10 px-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-bold tracking-tight text-white">DRIFT</div>
          <p className="mt-2 max-w-xs text-sm text-white/40">{site.tagline}</p>
        </div>
        <div className="flex gap-16">
          <div>
            <h4 className="text-sm font-medium text-white">Product</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/login" className="text-sm text-white/40 transition-colors hover:text-white/80">
                  Cockpit
                </Link>
              </li>
              <li>
                <a href="#strategies" className="text-sm text-white/40 transition-colors hover:text-white/80">
                  Strategies
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Connect</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href={site.x} target="_blank" rel="noreferrer" className="text-sm text-white/40 transition-colors hover:text-white/80">
                  X
                </a>
              </li>
              <li>
                <a href={`mailto:${site.contact}`} className="text-sm text-white/40 transition-colors hover:text-white/80">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>
      <Container className="mt-12 px-0">
        <div className="border-t border-white/5 pt-6 text-xs text-white/30">
          © {new Date().getFullYear()} DRIFT. Trading involves risk; backtested performance is not indicative of future results.
        </div>
      </Container>
    </footer>
  );
}
