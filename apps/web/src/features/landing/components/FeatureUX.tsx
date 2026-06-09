import { Reveal } from "./primitives";
import { SectionLabel, IconChip, Button } from "./ui";

export default function FeatureUX() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 md:grid-cols-2">
        {/* dispute mockup */}
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-ink p-6">
            {/* enriched data backdrop */}
            <div className="font-mono text-[9px] leading-relaxed text-lime/50">
              <div>38012128618</div>
              <div className="mt-2">▪ METHOD</div>
              <div>APPLE PAY</div>
              <div className="mt-2">▪ LOCATION</div>
              <div>1164 BROADWAY, NEW YORK, NY 10001</div>
              <div className="mt-2">▪ MERCHANT</div>
              <div>PANERA BREAD · DOORDASH</div>
              <div className="mt-2">▪ TRANSACTION VALUE</div>
              <div>$23.90</div>
            </div>

            {/* phone */}
            <div className="absolute right-5 top-6 w-44 overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-[#cfeccb] p-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e11b2c] text-white">
                    ◧
                  </span>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-ink">
                  Panera Bread · DoorDash
                </div>
                <div className="font-mono text-[8px] text-ink/50">
                  2025-09-27 09:23:16
                </div>
                <div className="mt-1 text-right text-lg font-bold text-ink">
                  -$23.90
                </div>
              </div>
              <div className="h-20 bg-gradient-to-br from-[#a8d89a] to-[#6fae5c]" />
              <div className="bg-ink py-2 text-center font-mono text-[9px] text-white">
                Dispute transaction
              </div>
              <div className="space-y-1 p-3 font-mono text-[8px] text-ink/60">
                <div className="flex justify-between">
                  <span>Transaction date</span>
                  <span>September 27, 2025</span>
                </div>
                <div className="flex justify-between">
                  <span>Method</span>
                  <span>Apple Pay</span>
                </div>
                <div className="flex justify-between">
                  <span>Account</span>
                  <span>Mastercard *6705</span>
                </div>
              </div>
            </div>

            {/* "before you dispute" popup */}
            <div className="absolute bottom-6 left-6 w-52 rounded-lg bg-white p-3 shadow-xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0b6b3a] text-white">
                ▴
              </span>
              <div className="mt-2 text-[11px] font-semibold text-ink">
                Before you dispute this transaction
              </div>
              <div className="font-mono text-[8px] text-ink/50">
                You may be able to clear things up faster by reaching out to the
                merchant directly.
              </div>
              <div className="mt-2 rounded bg-[#cfeccb] py-1.5 text-center font-mono text-[9px] text-ink">
                Contact merchant
              </div>
            </div>
          </div>
        </Reveal>

        {/* copy */}
        <Reveal delay={140}>
          <SectionLabel
            icon={<IconChip className="bg-yellow text-ink">◳</IconChip>}
          >
            User Experience
          </SectionLabel>
          <h3 className="mt-5 max-w-md text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-[1.05] tracking-tight text-ink">
            Move disputes to the merchant
          </h3>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/60">
            Give customers the clarity they need to recognize charges or contact
            the merchant directly — before a dispute ever reaches your support
            team.
          </p>
          <div className="mt-7">
            <Button variant="outline">Learn more</Button>
          </div>
          <div className="mt-8 inline-block rounded-md bg-sage px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ink/70">
            <span className="text-base font-bold text-ink">95%</span>{" "}
            Physical transactions matched with an exact geolocation
          </div>
        </Reveal>
      </div>
    </section>
  );
}
