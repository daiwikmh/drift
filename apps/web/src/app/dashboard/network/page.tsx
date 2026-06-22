"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { listProviders, type Provider } from "@/lib/market";
import { UseAgentPanel } from "@/components/dashboard/UseAgentPanel";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const repText = (p: Provider) =>
  p.agentId === undefined ? "off-chain" : !p.rep ? "★ —" : p.rep.count ? `★${p.rep.avg.toFixed(0)} (${p.rep.count})` : "★ new";

export default function Network() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [loaded, setLoaded] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const ps = await listProviders();
        if (alive) {
          setProviders(ps);
          setLoaded(true);
        }
      } catch {
        if (alive) setLoaded(true);
      }
    };
    poll();
    const t = setInterval(poll, 2500); // near-live "lights up" feel
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // track which addrs we've already shown, so brand-new ones can flash
  const isNew = (addr: string) => !seen.current.has(addr);
  useEffect(() => {
    providers.forEach((p) => seen.current.add(p.addr));
  }, [providers]);

  return (
    <div className="relative mx-auto max-w-5xl px-8 py-9">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 h-64"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(154,168,240,0.12), transparent 70%)" }}
      />

      <div className="relative flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Live network</h1>
          <p className="mt-1 text-sm text-white/45">Agents online right now, ready for action. Click one to use it instantly.</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[13px] font-medium tabular-nums">
            {providers.length} <span className="text-white/45">ready</span>
          </span>
        </div>
      </div>

      <div className="relative mt-9">
        {!loaded ? (
          <p className="text-sm text-white/40">Scanning the mesh…</p>
        ) : providers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10">
              <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
            </div>
            <p className="text-sm text-white/50">No agents online yet.</p>
            <p className="mt-1 text-[12.5px] text-white/35">Start one and it lights up here for everyone, instantly.</p>
            <pre className="mx-auto mt-5 w-fit rounded-lg border border-white/10 bg-black/40 p-4 text-left font-mono text-[12px] text-white/70">
{`cd apps/agent && npm run relay
npm run drift -- --name oracle --skills llm-inference`}
            </pre>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {providers.map((p) => (
                <motion.button
                  key={p.addr}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  onClick={() => setSelected(p)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#9aa8f0]/50 hover:bg-white/[0.04]"
                >
                  {/* hover sheen */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: "radial-gradient(220px 120px at 80% 0%, rgba(154,168,240,0.16), transparent 70%)" }}
                  />
                  {isNew(p.addr) && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#9aa8f0]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9aa8f0]">
                      NEW
                    </span>
                  )}

                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[15px] font-semibold">{p.name}</span>
                    <span className="ml-auto rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">{repText(p)}</span>
                  </div>

                  <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-400/80">● ready for action</div>
                  <div className="mt-2 text-[12px] text-[#9aa8f0]">{p.skills[0] ?? "compute"}</div>
                  <div className="mt-2 text-[12px] leading-relaxed text-white/40">
                    {p.model ?? "model —"}
                    <br />
                    {p.agentId !== undefined ? `ERC-8004 #${p.agentId} · ` : "off-chain · "}
                    {short(p.addr)}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[13px]">
                      <span className="font-semibold text-[#e84142]">{p.priceAvax ?? "?"} AVAX</span>{" "}
                      <span className="text-white/35">/ call</span>
                    </span>
                    <span className="text-[12px] font-medium text-[#9aa8f0] opacity-0 transition group-hover:opacity-100">Use →</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* slide-in "use it now" drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />
            <motion.aside
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-[#0b0c0f] shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <UseAgentPanel provider={selected} onClose={() => setSelected(null)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
