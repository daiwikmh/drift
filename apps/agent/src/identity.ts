// The agent's wallet IS its identity. Its Avalanche address is the handle other
// agents discover and pay; the ERC-8004 registration ties a name + skills to it.
import { privateKeyToAccount } from "viem/accounts";
import { config, hasWallet } from "./config.js";

export function agentAddress(): `0x${string}` | null {
  if (!hasWallet()) return null;
  return privateKeyToAccount(config.privateKey as `0x${string}`).address;
}

export function shortAddr(a: string): string {
  return a.length >= 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

// LLM provider/model resolution, mirroring the Python llm.py: nvapi-… → NVIDIA,
// anything else (incl. sk-or-…) → OpenRouter. OpenRouter wins if both keys set.
export function llmMeta(): { provider: string; model: string } | null {
  if (config.openrouterKey) {
    return { provider: "openrouter", model: config.llmModel || "anthropic/claude-3.5-sonnet" };
  }
  if (config.nvidiaKey) {
    return { provider: "nvidia", model: config.llmModel || "nvidia/nemotron-3-super-120b-a12b" };
  }
  return null;
}
