// A2A job protocol for the optimistic, validator-gated hire flow. Carried as the
// `payload` of A2AClient.send/onMessage (the relay routes by address). The chain
// stays the source of truth: this protocol coordinates three agents (buyer, worker,
// validator) but identity/reputation/payment are all on Avalanche.
//
//   buyer  ──job-request──▶ worker
//   worker ──job-deliver──▶ buyer            (worker delivers BEFORE payment — optimistic)
//   buyer  ──job-validate─▶ validator
//   validator ─job-attest─▶ buyer            (independent, signed verdict)
//   buyer pays worker (x402 AVAX) + giveFeedback on PASS
//   buyer  ──job-settle──▶ worker            (informational receipt)
import type { Attestation } from "../compute/validator.js";

export type JobRequest = { kind: "job-request"; jobId: string; skill: string; brief: string };
export type JobDeliver = {
  kind: "job-deliver";
  jobId: string;
  skill: string;
  brief: string;
  result: string;
  payload?: unknown;
  worker: string;
  workerAgentId?: number;
};
export type JobValidate = {
  kind: "job-validate";
  jobId: string;
  skill: string;
  brief: string;
  result: string;
  payload?: unknown;
  resultHash: string;
};
export type JobAttest = { kind: "job-attest"; jobId: string; attestation: Attestation };
export type JobSettle = {
  kind: "job-settle";
  jobId: string;
  verdict: "pass" | "fail";
  txHash?: string;
  feedbackTx?: string;
  reason?: string;
};

export type JobMsg = JobRequest | JobDeliver | JobValidate | JobAttest | JobSettle;

const KINDS = ["job-request", "job-deliver", "job-validate", "job-attest", "job-settle"];

export function isJobMsg(p: unknown): p is JobMsg {
  return !!p && typeof p === "object" && KINDS.includes((p as { kind?: string }).kind ?? "");
}
