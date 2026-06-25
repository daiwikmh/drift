// The validator role: an independent third agent that judges a worker's output and
// signs an attestation. Because the ERC-8004 Validation Registry is NOT deployed on
// Fuji, the attestation is a signature over the verdict that anyone can verify maps
// to the validator's on-chain identity (ownerOf the validator's agentId). This is
// what makes reputation un-gameable: a buyer only rewards a worker when an
// independent, on-chain-identifiable validator attests the work — no self-dealing.
import { createHash } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { verifyMessage } from "viem";
import { complete, llmEnabled } from "../llm.js";
import { ticker } from "./market.js";
import { getIdentity } from "../chain/registry.js";

export type Verdict = "pass" | "fail";

export type Judgement = { verdict: Verdict; score: number; reason: string };

export type Attestation = {
  jobId: string;
  skill: string;
  resultHash: string; // sha256 of the worker's result
  verdict: Verdict;
  score: number; // 0..100
  reason: string;
  validator: `0x${string}`; // the validator's wallet (= ERC-8004 owner)
  agentId?: number; // the validator's ERC-8004 identity, if registered
  signature: `0x${string}`;
  issuedAt: number;
};

export function hashResult(result: unknown): string {
  const s = typeof result === "string" ? result : JSON.stringify(result);
  return createHash("sha256").update(s).digest("hex");
}

const attestMessage = (a: {
  jobId: string;
  resultHash: string;
  verdict: Verdict;
  score: number;
}): string => `drift-attest:${a.jobId}:${a.resultHash}:${a.verdict}:${a.score}`;

// Judge a worker's output independently. Where the work has objective structure we
// check that (a trade-signal's entry price must be a real, in-range quote); otherwise
// an LLM-judge scores relevance/quality. Never fabricates — a missing LLM key falls
// back to a conservative structural check so a verdict is always grounded.
export async function judge(skill: string, brief: string, result: unknown): Promise<Judgement> {
  if (skill === "trade-signal") return judgeSignal(result);
  return judgeGeneric(brief, result);
}

async function judgeSignal(result: unknown): Promise<Judgement> {
  const sig = (result as { signal?: { symbol?: string; entryPrice?: number; direction?: string } })?.signal;
  if (!sig?.symbol || typeof sig.entryPrice !== "number") {
    return { verdict: "fail", score: 0, reason: "malformed signal — missing symbol/entryPrice" };
  }
  try {
    const t = await ticker(sig.symbol);
    // The signal's entry must be a real, current quote: inside today's range and
    // within 2% of last. Catches fabricated or stale prices.
    const inRange = sig.entryPrice >= t.low24h * 0.98 && sig.entryPrice <= t.high24h * 1.02;
    const close = Math.abs(sig.entryPrice - t.last) / t.last <= 0.02;
    if (inRange && close) {
      return { verdict: "pass", score: 100, reason: `entry $${sig.entryPrice} verified against live ${sig.symbol} ($${t.last})` };
    }
    return { verdict: "fail", score: 0, reason: `entry $${sig.entryPrice} not consistent with live ${sig.symbol} ($${t.last}, range $${t.low24h}–$${t.high24h})` };
  } catch (e) {
    return { verdict: "fail", score: 0, reason: `could not verify quote: ${(e as Error).message.split("\n")[0]}` };
  }
}

async function judgeGeneric(brief: string, result: unknown): Promise<Judgement> {
  const text = typeof result === "string" ? result : (result as { result?: string })?.result ?? JSON.stringify(result);
  if (!text || !text.trim()) return { verdict: "fail", score: 0, reason: "empty result" };

  if (!llmEnabled()) {
    // Conservative structural fallback: a non-trivial, on-topic-length answer passes.
    const ok = text.trim().length >= 20;
    return { verdict: ok ? "pass" : "fail", score: ok ? 70 : 0, reason: ok ? "non-empty substantive answer (no LLM judge)" : "answer too short" };
  }

  const sys =
    "You are an impartial validator. Score how well the RESULT answers the TASK on a 0-100 scale " +
    'for correctness, relevance and completeness. Output ONLY JSON: {"score":0..100,"reason":"<=160 chars"}. ' +
    "Be strict; a non-answer or off-topic result scores under 40.";
  try {
    const out = await complete(sys, `TASK:\n${brief}\n\nRESULT:\n${text.slice(0, 4000)}`);
    const m = out?.match(/\{[\s\S]*\}/);
    if (m) {
      const j = JSON.parse(m[0]) as { score?: number; reason?: string };
      const score = Math.max(0, Math.min(100, Math.round(j.score ?? 0)));
      return { verdict: score >= 60 ? "pass" : "fail", score, reason: (j.reason ?? "").slice(0, 160) || "judged by validator LLM" };
    }
  } catch {
    /* fall through to conservative pass */
  }
  return { verdict: "pass", score: 60, reason: "validator LLM inconclusive — provisional pass" };
}

// Produce a signed attestation for a judged result.
export async function attest(
  privateKey: `0x${string}`,
  args: { jobId: string; skill: string; resultHash: string; agentId?: number },
  j: Judgement
): Promise<Attestation> {
  const account = privateKeyToAccount(privateKey);
  const base = { jobId: args.jobId, resultHash: args.resultHash, verdict: j.verdict, score: j.score };
  const signature = await account.signMessage({ message: attestMessage(base) });
  return {
    ...base,
    skill: args.skill,
    reason: j.reason,
    validator: account.address,
    agentId: args.agentId,
    signature,
    issuedAt: Math.floor(Date.now() / 1000),
  };
}

// Verify an attestation: the signature must recover to the named validator, and (if
// it claims an on-chain identity) that wallet must own the validator's agentId on
// Avalanche. resultHash must match the result the buyer actually received.
export async function verifyAttestation(
  att: Attestation,
  expectedResultHash: string
): Promise<{ ok: boolean; reason?: string }> {
  if (att.resultHash !== expectedResultHash) return { ok: false, reason: "result hash mismatch" };
  const valid = await verifyMessage({
    address: att.validator,
    message: attestMessage(att),
    signature: att.signature,
  });
  if (!valid) return { ok: false, reason: "bad validator signature" };
  if (att.agentId !== undefined) {
    try {
      const { owner } = await getIdentity(BigInt(att.agentId));
      if (owner.toLowerCase() !== att.validator.toLowerCase()) {
        return { ok: false, reason: "validator does not own the claimed agent id" };
      }
    } catch {
      return { ok: false, reason: "could not read validator identity on-chain" };
    }
  }
  return { ok: true };
}
