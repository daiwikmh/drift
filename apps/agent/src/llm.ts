// OpenAI-compatible LLM client for the agent's actual work + conversational loop.
// Runtime-configurable: `setup` (or env, or ~/.drift/llm.json) sets the provider
// and key live. Returns null when unconfigured — callers fall back to an honest
// empty state (no fabricated output).
import OpenAI from "openai";
import { config } from "./config.js";
import type { Provider } from "./store.js";

const DEFAULT_MODEL: Record<Provider, string> = {
  openrouter: "anthropic/claude-3.5-sonnet",
  nvidia: "openai/gpt-oss-120b",
};
const BASE_URL: Record<Provider, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  nvidia: "https://integrate.api.nvidia.com/v1",
};

let current: { provider: Provider; apiKey: string; model: string } | null = null;

// nvapi-… → NVIDIA; anything else (incl. sk-or-…) → OpenRouter.
export function detectProvider(key: string): Provider {
  return key.startsWith("nvapi-") ? "nvidia" : "openrouter";
}

export function setLlm(provider: Provider, apiKey: string, model?: string): void {
  current = { provider, apiKey, model: model || config.llmModel || DEFAULT_MODEL[provider] };
}

export function llmEnabled(): boolean {
  return current !== null;
}

export function llmMeta(): { provider: Provider; model: string } | null {
  return current ? { provider: current.provider, model: current.model } : null;
}

export function defaultModel(provider: Provider): string {
  return config.llmModel || DEFAULT_MODEL[provider];
}

// Seed from env on import (OpenRouter wins if both set). `setup`/store override later.
if (config.openrouterKey) setLlm("openrouter", config.openrouterKey);
else if (config.nvidiaKey) setLlm("nvidia", config.nvidiaKey);

export async function complete(system: string, user: string, model?: string): Promise<string | null> {
  if (!current) return null;
  const client = new OpenAI({
    apiKey: current.apiKey,
    baseURL: config.llmBaseUrl || BASE_URL[current.provider],
  });
  const body: Record<string, unknown> = {
    model: model || current.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 1024,
  };
  // NVIDIA-hosted reasoning models default to heavy thinking — slow and prone to
  // leaking the scratchpad into content. "low" keeps the answer in content and fast.
  if (current.provider === "nvidia") body.reasoning_effort = "low";
  const r = await client.chat.completions.create(body as unknown as Parameters<typeof client.chat.completions.create>[0]);
  return (r as { choices: { message?: { content?: string } }[] }).choices[0]?.message?.content?.trim() || null;
}
