// Runtime configuration for the DRIFT agent. Loads the repo-root .env.local (and
// cwd .env.local) into process.env if present — secrets are read here, never echoed
// or written elsewhere.
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const p of [
  resolve(process.cwd(), ".env.local"),
  resolve(here, "../../../.env.local"), // repo root from src/
  resolve(here, "../../../../.env.local"), // repo root from dist/
]) {
  if (existsSync(p)) loadEnv({ path: p, override: false });
}

export const config = {
  // Avalanche Fuji
  rpcUrl: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",

  // A2A transport: a thin WebSocket rendezvous relay every agent dials out to, so
  // agents on different machines (incl. behind NAT) can reach each other.
  relayUrl: process.env.RELAY_URL || "ws://localhost:8787",

  // Optional LLM seeding from env (otherwise set it in-app with `setup`, persisted
  // to ~/.drift/llm.json). OpenRouter or NVIDIA NIM, OpenAI-compatible.
  openrouterKey: process.env.OPENROUTER_API_KEY || "",
  nvidiaKey: process.env.NVIDIA_API_KEY || process.env.LLM_API_KEY || "",
  llmBaseUrl: process.env.LLM_BASE_URL || "",
  llmModel: process.env.LLM_MODEL || "",
} as const;
