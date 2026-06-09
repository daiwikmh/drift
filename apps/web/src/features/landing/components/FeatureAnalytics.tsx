import { Reveal, CountUp } from "./primitives";
import { SectionLabel, IconChip } from "./ui";

const txns = [
  { label: "ACCOUNT TRANSFER", v: "NAVY FEDERAL CREDIT UNION" },
  { label: "CARD TRANSACTION", v: "SMITHFIELD'S CHICKEN 'N BAR-B-Q" },
  { label: "CARD TRANSACTION", v: "MASSACHUSETTS BAY TRANSPORTATION AUTHORITY" },
  { label: "GOOGLE PAY", v: "TRAVEL TOWN · MERGE ADVENTURE · GOOGLE PLAY" },
];

const stats = [
  { label: "Transactions", sub: "Average per month", node: <><span>~</span><CountUp value={274} /></> },
  { label: "Income", sub: "Per month", node: <CountUp value={4283} prefix="$" /> },
  { label: "Loan offer", sub: "Estimated value", node: <CountUp value={15000} prefix="$" /> },
  { label: "Interest rate", sub: "Base rate", node: <CountUp value={12} suffix="%" /> },
];

export default function FeatureAnalytics() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="overflow-hidden rounded-[28px] bg-ink p-8 md:p-14">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <Reveal>
              <SectionLabel
                tone="light"
                icon={<IconChip className="bg-lime text-ink">▦</IconChip>}
              >
                Analytics &amp; AI
              </SectionLabel>
              <h3 className="mt-6 max-w-sm text-[clamp(1.9rem,3.8vw,2.8rem)] font-bold leading-[1.05] tracking-tight text-white">
                Build intelligence on solid data
              </h3>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
                Provide consistent merchant context across cards, transfers, and
                third party sources — powering personalized offers, new product
                features, and better cross-sell opportunities.
              </p>
              <div className="mt-7">
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-md border border-white/25 px-6 py-3 font-mono text-sm text-white transition hover:bg-white/10"
                >
                  Learn more
                </a>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="grid gap-3">
                {/* analyzing terminal */}
                <div className="rounded-lg border border-lime/30 bg-[#0c1407] p-4 text-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-lime text-ink">
                    ▦
                  </span>
                  <div className="mt-3 font-mono text-[12px] text-lime caret">
                    Analyzing customer spending...
                  </div>
                  <div className="mx-auto mt-3 flex max-w-[200px] gap-1">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: i < 11 ? "var(--lime)" : "rgba(255,255,255,0.12)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* enriched transaction rows */}
                <div className="rounded-lg border border-white/10">
                  {txns.map((t, i) => (
                    <div
                      key={i}
                      className="border-b border-white/10 px-4 py-2 font-mono text-[9px] text-white/60 last:border-0"
                    >
                      <div className="text-lime/80">▸ {t.label}</div>
                      <div>{t.v}</div>
                    </div>
                  ))}
                </div>

                {/* stat cards + counters */}
                <div className="grid gap-2">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between rounded-lg bg-white px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-ink">
                          {s.label}
                        </div>
                        <div className="font-mono text-[9px] text-ink/50">
                          {s.sub}
                        </div>
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-ink">
                        {s.node}
                      </div>
                    </div>
                  ))}
                  <a
                    href="#"
                    className="rounded-lg bg-lime py-3 text-center font-mono text-sm font-medium text-ink transition hover:brightness-95"
                  >
                    Send offers
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
