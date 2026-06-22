// Persistent local state under ~/.drift — the agent's wallet (its identity) and
// the LLM config set via `setup`. Mirrors the neurus CLI's ~/.neurus pattern.
// Files are written 0600. A wallet is created on first run; pass --name to keep
// separate wallets for separate agents on one machine.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export const DRIFT_DIR = join(homedir(), ".drift");

export interface Wallet {
  name: string;
  address: `0x${string}`;
  privateKey: `0x${string}`;
  createdAt: number;
}

const slug = (s: string) => s.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "drift";
const walletFile = (name: string) => join(DRIFT_DIR, `wallet-${slug(name)}.json`);

// Load the agent's wallet, creating + persisting one on first run. Env overrides
// (not written to disk): AGENT_PRIVATE_KEY applies to any --name; ETH_PRIVATE_KEY
// (the funded wallet) applies only to the default agent, so named agents still get
// their own auto-created wallets and the keyless multi-agent demo keeps working.
export async function loadOrCreateWallet(name: string): Promise<{ wallet: Wallet; created: boolean }> {
  const envKey =
    process.env.AGENT_PRIVATE_KEY || (name === "drift" ? process.env.ETH_PRIVATE_KEY : undefined);
  if (envKey && /^0x[0-9a-fA-F]{64}$/.test(envKey)) {
    const acct = privateKeyToAccount(envKey as `0x${string}`);
    return { wallet: { name, address: acct.address, privateKey: envKey as `0x${string}`, createdAt: 0 }, created: false };
  }
  const f = walletFile(name);
  try {
    return { wallet: JSON.parse(await readFile(f, "utf8")) as Wallet, created: false };
  } catch {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    const wallet: Wallet = { name, address: acct.address, privateKey: pk, createdAt: Date.now() };
    await mkdir(DRIFT_DIR, { recursive: true });
    await writeFile(f, JSON.stringify(wallet, null, 2), { mode: 0o600 });
    return { wallet, created: true };
  }
}

export type Provider = "openrouter" | "nvidia";
export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model?: string;
}

const llmFile = join(DRIFT_DIR, "llm.json");

export async function loadLlm(): Promise<LlmConfig | null> {
  try {
    return JSON.parse(await readFile(llmFile, "utf8")) as LlmConfig;
  } catch {
    return null;
  }
}

export async function saveLlm(cfg: LlmConfig): Promise<void> {
  await mkdir(DRIFT_DIR, { recursive: true });
  await writeFile(llmFile, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export const llmConfigPath = llmFile;

// The agent's ERC-8004 agentId, keyed by address (the registry isn't enumerable,
// so we remember the id minted at registration).
const agentIdFile = (address: string) => join(DRIFT_DIR, `agent-${address.toLowerCase()}.json`);

export async function loadAgentId(address: string): Promise<bigint | null> {
  try {
    const j = JSON.parse(await readFile(agentIdFile(address), "utf8")) as { agentId: string };
    return BigInt(j.agentId);
  } catch {
    return null;
  }
}

export async function saveAgentId(address: string, agentId: bigint): Promise<void> {
  await mkdir(DRIFT_DIR, { recursive: true });
  await writeFile(agentIdFile(address), JSON.stringify({ address, agentId: agentId.toString() }, null, 2), {
    mode: 0o600,
  });
}

// Trade signals the buyer purchased, kept until they can be settled against price.
export interface SignalRecord {
  id: string;
  provider: string; // provider address
  agentId?: number; // provider's ERC-8004 id (for outcome-weighted feedback)
  signal: {
    symbol: string;
    direction: "long" | "short" | "flat";
    horizonHours: number;
    entryPrice: number;
    confidence: number;
    rationale: string;
    issuedAt: number;
    model?: string | null;
  };
  signature?: string;
  boughtAt: number;
  settled?: boolean;
  outcome?: { hit: boolean; pnlPct: number; exitPrice: number; value: number; feedbackTx?: string };
}

const signalsFile = (address: string) => join(DRIFT_DIR, `signals-${address.toLowerCase()}.json`);

export async function loadSignals(address: string): Promise<SignalRecord[]> {
  try {
    return JSON.parse(await readFile(signalsFile(address), "utf8")) as SignalRecord[];
  } catch {
    return [];
  }
}

export async function saveSignals(address: string, list: SignalRecord[]): Promise<void> {
  await mkdir(DRIFT_DIR, { recursive: true });
  await writeFile(signalsFile(address), JSON.stringify(list, null, 2), { mode: 0o600 });
}
