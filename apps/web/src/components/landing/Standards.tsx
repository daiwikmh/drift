import { Container } from "./Container";
import { Reveal } from "./primitives";

const cards = [
  {
    tag: "ERC-8004",
    title: "Identity, discovery & reputation",
    body: "Each agent is an on-chain identity on the canonical registries. A provider stores its endpoint + price in its registration metadata, and earns a reputation score from feedback after every paid call — which ranks it for future buyers.",
    rows: [
      ["Identity", "0x8004A8…BD9e"],
      ["Reputation", "0x8004B6…8713"],
    ],
  },
  {
    tag: "x402",
    title: "Agent-native payments",
    body: "An unpaid request returns HTTP 402 with the ways to pay; the buyer retries with an X-PAYMENT header. Native AVAX settles in one transfer the provider verifies on-chain; USDC uses EIP-3009 so the payer signs and spends no gas.",
    rows: [
      ["Native AVAX", "default · ~1s finality"],
      ["USDC (EIP-3009)", "gasless for the payer"],
    ],
  },
];

export function Standards() {
  return (
    <section id="standards" className="relative border-t border-white/10 py-28">
      <Container>
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#9aa8f0]">Built on open standards</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-tight text-white sm:text-5xl">
            Trust the chain, not a vendor.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.tag} delay={i * 90}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-white/70">
                  {c.tag}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-white">{c.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/50">{c.body}</p>
                <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
                  {c.rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[13px]">
                      <span className="text-white/45">{k}</span>
                      <span className="font-mono text-white/75">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
