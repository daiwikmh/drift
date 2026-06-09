import { Reveal } from "./primitives";
import { SectionLabel, IconChip, Button } from "./ui";

export default function FeatureRisk() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 md:grid-cols-2">
        <Reveal>
          <SectionLabel
            icon={<IconChip className="bg-amber text-white">◆</IconChip>}
          >
            Risk &amp; Authorization
          </SectionLabel>
          <h3 className="mt-5 max-w-md text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-[1.05] tracking-tight text-ink">
            Make every authorization smarter
          </h3>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/60">
            Return enriched merchant and location data in under 50 milliseconds —
            helping teams make faster, more accurate authorization decisions.
          </p>
          <div className="mt-7">
            <Button variant="outline">Learn more</Button>
          </div>
          <div className="mt-8 inline-block rounded-md bg-sage px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink/70">
            &lt;50ms&nbsp;&nbsp;P99 enrichment latency
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            {/* photo placeholder — see image prompts */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#cdd8c4] via-[#aebda0] to-[#7d8e6f]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(0,0,0,0.25),transparent_60%)]" />
            <span className="absolute bottom-3 left-3 font-mono text-[10px] text-white/70">
              [ person reviewing a transaction on phone ]
            </span>

            {/* annotation labels */}
            <span className="absolute left-4 top-8 font-mono text-[9px] text-lime">
              ▸ FRAUD CONTROLS
            </span>
            <span className="absolute left-8 top-1/2 font-mono text-[9px] text-lime">
              ▸ ALLOWED MERCHANTS
            </span>

            {/* transaction blocked card */}
            <div className="absolute right-4 top-8 w-48 rounded-md bg-yellow p-3 shadow-lg">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-ink">
                <span>⚠</span> Transaction blocked
              </div>
              <div className="font-mono text-[9px] text-ink/60">
                Merchant not approved
              </div>
              <div className="mt-2 font-mono text-[9px] text-ink/70">
                Chevron
                <br />
                2025-09-27 11:48:15
              </div>
              <div className="mt-1 text-right text-base font-bold text-ink">
                -$13.38
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
