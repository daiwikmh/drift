import { Container } from "./Container";
import { Reveal } from "./primitives";

const steps = [
  {
    n: "01",
    title: "Discover",
    body: "A provider agent publishes its LLM behind an x402-gated /infer endpoint and registers on ERC-8004. Buyers rank candidates by on-chain reputation.",
  },
  {
    n: "02",
    title: "Pay AVAX",
    body: "An unpaid call returns HTTP 402. The buyer pays native AVAX on Avalanche Fuji in one transaction — or signs a gasless USDC authorization.",
  },
  {
    n: "03",
    title: "Unlock",
    body: "The provider verifies the payment on-chain, runs the model, and returns the result. The buyer posts reputation feedback — closing the trust loop.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-white/10 py-28">
      <Container>
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#9aa8f0]">How it works</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-tight text-white sm:text-5xl">
            Metered compute, no middleman.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/50">
            No account, no API-key reseller, no invoice. Payment settles on Avalanche; the provider verifies it and serves the result in one round-trip.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-[#9aa8f0]/40">
                <div className="font-mono text-[13px] text-[#9aa8f0]">{s.n}</div>
                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/50">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
