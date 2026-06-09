import { Reveal } from "./primitives";

const logos = [
  "FIS",
  "Citizens",
  "BAIN & COMPANY",
  "unit",
  "monzo",
  "motive",
  "Cash App",
];

export default function Logos() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="text-center font-mono text-[12px] uppercase tracking-[0.12em] text-ink/60">
            Enriching billions of transactions for category-defining fintechs
            &amp; Fortune 500 banks every month
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-xl font-semibold text-ink/40">
            {logos.map((l) => (
              <span key={l} className="whitespace-nowrap">
                {l}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
