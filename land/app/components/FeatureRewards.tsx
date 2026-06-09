import { Reveal } from "./primitives";
import { SectionLabel, IconChip, Button } from "./ui";

const merchants = [
  { logo: "CAVA", bg: "bg-yellow text-ink", name: "CAVA", time: "2025-09-27 09:23:16", amt: "-$14.53", pts: "+140 pts" },
  { logo: "sg", bg: "bg-ink text-lime", name: "Sweetgreen", time: "2025-09-27 09:23:16", amt: "-$18.45", pts: "+180 pts", active: true },
  { logo: "UP", bg: "bg-[#0b6b3a] text-white", name: "Urban Plates", time: "2025-09-27 11:49:11", amt: "-$13.38", pts: "+130 pts" },
];

export default function FeatureRewards() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal className="text-center">
          <div className="flex justify-center">
            <SectionLabel
              icon={<IconChip className="bg-[#0b6b3a] text-white">♥</IconChip>}
            >
              Rewards &amp; Attribution
            </SectionLabel>
          </div>
          <h3 className="mx-auto mt-5 max-w-xl text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-tight text-ink">
            Connect every purchase to the right reward
          </h3>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink/60">
            Give marketing teams true merchant and location-level clarity,
            enabling targeted, meaningful programs without messy data or
            guesswork.
          </p>
          <div className="mt-7 flex justify-center">
            <Button variant="outline">Learn more</Button>
          </div>
        </Reveal>

        {/* criteria + cards grid */}
        <div className="relative mt-20">
          {/* dashed grid backdrop */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 32%, var(--line) 32%, var(--line) calc(32% + 1px))",
            }}
          />

          <Reveal className="relative mx-auto max-w-md">
            <div className="flex items-center justify-between rounded-xl bg-[#3a2a14] px-5 py-4 text-white">
              <div>
                <div className="text-sm font-semibold">Reward Criteria</div>
                <div className="font-mono text-[10px] text-white/60">
                  Reward customers who spend on healthy food
                </div>
              </div>
              <span className="text-amber">♥</span>
            </div>
            <div className="mx-auto h-8 w-px bg-ink/20" />
          </Reveal>

          <div className="relative grid gap-5 md:grid-cols-3">
            {merchants.map((m, i) => (
              <Reveal key={m.name} delay={i * 120}>
                <div className="rounded-xl border border-ink/10 bg-white p-4">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold ${m.bg}`}
                  >
                    {m.logo}
                  </span>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {m.name}
                      </div>
                      <div className="font-mono text-[10px] text-ink/50">
                        {m.time}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-ink">{m.amt}</div>
                  </div>
                </div>
                <div
                  className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${
                    m.active
                      ? "bg-amber-soft"
                      : "border border-ink/10 bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <span className="text-amber">♥</span> Rewards
                  </span>
                  <span className="font-bold text-ink">{m.pts}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
