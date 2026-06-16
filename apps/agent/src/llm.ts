// OpenAI-compatible LLM client for the agent's actual work. OpenRouter or NVIDIA
// NIM, picked from whichever key is set (see identity.llmMeta). Returns null when
// no key is configured — callers fall back to an honest empty state (no fabricated
// output).
import OpenAI from "openai";
import { config } from "./config.js";
import { llmMeta } from "./identity.js";

const BASE_URL: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  nvidia: "https://integrate.api.nvidia.com/v1",
};

export async function complete(system: string, user: string): Promise<string | null> {
  const meta = llmMeta();
  if (!meta) return null;
  const apiKey = config.openrouterKey || config.nvidiaKey;
  const baseURL = config.llmBaseUrl || BASE_URL[meta.provider];
  const client = new OpenAI({ apiKey, baseURL });
  const r = await client.chat.completions.create({
    model: meta.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 400,
  });
  return r.choices[0]?.message?.content?.trim() ?? null;
}
