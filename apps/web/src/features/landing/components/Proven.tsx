import { Reveal, CountUp } from "./primitives";
import { Brackets } from "./art";

export default function Proven() {
  return (
    <section className="bg-sage py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <h2 className="max-w-md text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-[1.02] tracking-tight text-ink">
            Proven across payments and beyond
          </h2>
          <div className="mt-4">
            <ArrowLinkText>See all case studies</ArrowLinkText>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {/* testimonial card */}
          <Reveal className="md:col-span-1">
            <div className="flex h-full flex-col justify-between rounded-2xl bg-ink p-7 text-white">
              <p className="text-lg leading-snug">
                “Spade&apos;s granular merchant data allows us to deliver new and
                innovative rewards on the more than $5 billion in neighborhood
                spend happening on our platform.”
              </p>
              <div className="mt-8">
                <div className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                  Brandt Smallwood, President
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-xs text-lime">
                    ▸ Read case study
                  </span>
                  <span className="text-xl font-bold tracking-widest">
                    BILT
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* stat 1 */}
          <Reveal delay={120}>
            <div className="relative h-full p-6">
              <Brackets className="border-ink/40" />
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink/60">
                ▪ Stat
              </div>
              <p className="mt-3 max-w-[15rem] font-mono text-[11px] leading-relaxed text-ink/60">
                Rewarded by Bilt using Spade for accurate, hyper-local
                attribution
              </p>
              <div className="mt-16 text-[clamp(2.5rem,6vw,4rem)] font-bold tracking-tight text-ink">
                <CountUp value={5} suffix="B+" prefix="$" />
              </div>
            </div>
          </Reveal>

          {/* stat 2 */}
          <Reveal delay={240}>
            <div className="relative h-full p-6">
              <Brackets className="border-ink/40" />
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink/60">
                ▪ Stat
              </div>
              <p className="mt-3 max-w-[15rem] font-mono text-[11px] leading-relaxed text-ink/60">
                Local businesses in Bilt&apos;s rewards network, accurately
                matched to transactions using Spade
              </p>
              <div className="mt-16 text-[clamp(2.5rem,6vw,4rem)] font-bold tracking-tight text-ink">
                <CountUp value={45000} suffix="+" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ArrowLinkText({ children }: { children: React.ReactNode }) {
  return (
    <a href="#" className="font-mono text-sm text-ink hover:underline">
      ▸ {children}
    </a>
  );
}
