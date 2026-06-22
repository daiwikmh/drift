import { Card } from "@/components/dashboard/ui";

const steps = [
  {
    title: "1 · Boot a provider agent",
    body: "Any agent booted with --skills runs an x402-gated /infer server and advertises it to the relay.",
    code: `cd apps/agent && npm install
npm run relay                                          # rendezvous hub (:8787)
npm run drift -- --name oracle --skills llm-inference  # your provider`,
  },
  {
    title: "2 · Add an LLM key",
    body: "At the agent prompt, run `setup` and paste an OpenRouter (sk-or-…) or NVIDIA (nvapi-…) key. This is the model you resell, metered per call.",
    code: `> setup`,
  },
  {
    title: "3 · Register on-chain",
    body: "Mint your ERC-8004 identity. Your endpoint + price are baked into the registration metadata, so buyers discover and rank you from the chain.",
    code: `> register`,
  },
  {
    title: "4 · Set your price (optional)",
    body: "Price per call defaults to 0.001 AVAX (and 0.01 USDC for the gasless rail). Override via env before boot.",
    code: `COMPUTE_PRICE_AVAX=0.002 npm run drift -- --name oracle --skills llm-inference`,
  },
];

export default function Serve() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-9">
      <h1 className="font-display text-2xl tracking-tight">Become a provider</h1>
      <p className="mt-1 text-sm text-white/45">
        Sell your LLM as metered, x402-gated inference. Buyers pay AVAX to unlock each call; you settle and serve.
      </p>

      <div className="mt-8 space-y-4">
        {steps.map((s) => (
          <Card key={s.title} title={s.title} sub={s.body}>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/70">
              {s.code}
            </pre>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-[13px] text-white/40">
        You need a little testnet AVAX for gas —{" "}
        <a
          className="text-[#9aa8f0] hover:underline"
          href="https://core.app/tools/testnet-faucet/"
          target="_blank"
          rel="noreferrer"
        >
          Avalanche Fuji faucet ↗
        </a>
        . Then your provider shows up on the{" "}
        <a className="text-[#9aa8f0] hover:underline" href="/dashboard">
          Marketplace
        </a>
        .
      </p>
    </div>
  );
}
