// The optimistic, validator-gated job engine. One engine plays all three roles
// depending on the message it gets: BUYER (hires + pays), WORKER (does the work and
// delivers before payment — it carries the deadbeat risk), VALIDATOR (independently
// judges + signs). Coordination rides the existing A2A relay; identity, reputation
// and payment are real Avalanche Fuji operations. No escrow, no contract.
import { privateKeyToAccount } from "viem/accounts";
import type { Peer } from "../a2a/types.js";
import { buildAvaxRequirement, payAvax } from "../x402/avax.js";
import { giveFeedback, getReputation } from "../chain/registry.js";
import { hashResult, judge, attest, verifyAttestation, type Attestation } from "../compute/validator.js";
import { generateSignal } from "../compute/signal.js";
import { generateAllocation } from "../compute/yield.js";
import { complete, llmEnabled } from "../llm.js";
import { isJobMsg, type JobMsg } from "./protocol.js";

type Status = "requested" | "delivered" | "validating" | "settled" | "rejected" | "failed";

type Job = {
  jobId: string;
  skill: string;
  brief: string;
  worker: string;
  workerAgentId?: number;
  workerPrice: number;
  validator?: string;
  result?: string;
  payload?: unknown;
  resultHash?: string;
  attestation?: Attestation;
  status: Status;
  txHash?: string;
  feedbackTx?: string;
};

export interface EngineDeps {
  self: { addr: `0x${string}`; name: string; agentId?: number; privateKey: `0x${string}` };
  send: (to: string, payload: unknown) => void;
  peers: () => Peer[];
  emit: (actor: string, color: string, text: string) => void;
  sub: (text: string) => void;
  txUrl: (h: string) => string;
  colors: { accent: string; up: string; amber: string; dim: string };
  onSettled?: () => void;
}

export class JobEngine {
  private jobs = new Map<string, Job>();
  constructor(private d: EngineDeps) {}

  list(): Job[] {
    return [...this.jobs.values()];
  }

  // --- BUYER: start a job -----------------------------------------------------
  async hire(skill: string, brief: string): Promise<void> {
    const { emit, colors } = this.d;
    const worker = await this.pickBySkill(skill, []);
    if (!worker) {
      emit("mkt", colors.amber, `no agent online for "${skill}" — start one with \`drift agent --skills ${skill}\``);
      return;
    }
    const validator = await this.pickBySkill("validator", [worker.addr]);
    if (!validator) {
      emit("mkt", colors.amber, "no validator online — start one with `drift agent --skills validator` (it gates payment)");
      return;
    }
    const jobId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.jobs.set(jobId, {
      jobId,
      skill,
      brief,
      worker: worker.addr,
      workerAgentId: worker.agentId,
      workerPrice: worker.priceAvax ?? 0.001,
      validator: validator.addr,
      status: "requested",
    });
    emit("you", colors.accent, `hire ${worker.name} for "${skill}" · validator ${validator.name}`);
    this.d.send(worker.addr, { kind: "job-request", jobId, skill, brief } satisfies JobMsg);
    this.d.sub(`job ${jobId} requested — worker delivers, then ${validator.name} attests, then I pay on PASS`);
  }

  // --- inbound A2A dispatch ----------------------------------------------------
  async handle(from: string, payload: unknown): Promise<void> {
    if (!isJobMsg(payload)) return;
    const msg = payload;
    switch (msg.kind) {
      case "job-request":
        return this.onRequest(from, msg);
      case "job-deliver":
        return this.onDeliver(msg);
      case "job-validate":
        return this.onValidate(from, msg);
      case "job-attest":
        return this.onAttest(msg);
      case "job-settle":
        return this.onSettle(from, msg);
    }
  }

  // --- WORKER: do the work, deliver before payment ----------------------------
  private async onRequest(from: string, msg: Extract<JobMsg, { kind: "job-request" }>): Promise<void> {
    const { emit, colors } = this.d;
    emit("inbox", colors.accent, `job ${msg.jobId} · ${msg.skill} requested by ${shortAddr(from)}`);
    try {
      const { result, payload } = await this.work(msg.skill, msg.brief);
      this.d.send(from, {
        kind: "job-deliver",
        jobId: msg.jobId,
        skill: msg.skill,
        brief: msg.brief,
        result,
        payload,
        worker: this.d.self.addr,
        workerAgentId: this.d.self.agentId,
      } satisfies JobMsg);
      emit("drift", colors.up, `delivered job ${msg.jobId} (awaiting validation + payment)`);
    } catch (e) {
      emit("drift", colors.amber, `job ${msg.jobId} failed: ${(e as Error).message.split("\n")[0]}`);
    }
  }

  // --- BUYER: got the work, send it to the validator --------------------------
  private async onDeliver(msg: Extract<JobMsg, { kind: "job-deliver" }>): Promise<void> {
    const { emit, colors } = this.d;
    const job = this.jobs.get(msg.jobId);
    if (!job) return;
    job.result = msg.result;
    job.payload = msg.payload;
    job.workerAgentId = msg.workerAgentId ?? job.workerAgentId;
    job.resultHash = hashResult(msg.payload ?? msg.result);
    job.status = "validating";
    emit("mkt", colors.accent, `received result for ${msg.jobId} — requesting independent validation`);
    if (msg.result) this.d.sub(msg.result.slice(0, 160));
    if (!job.validator) {
      emit("drift", colors.amber, "no validator assigned — cannot settle");
      job.status = "failed";
      return;
    }
    this.d.send(job.validator, {
      kind: "job-validate",
      jobId: job.jobId,
      skill: job.skill,
      brief: job.brief,
      result: msg.result,
      payload: msg.payload,
      resultHash: job.resultHash,
    } satisfies JobMsg);
  }

  // --- VALIDATOR: judge independently, sign an attestation --------------------
  private async onValidate(from: string, msg: Extract<JobMsg, { kind: "job-validate" }>): Promise<void> {
    const { emit, colors, self } = this.d;
    emit("inbox", colors.accent, `validate ${msg.jobId} · ${msg.skill}`);
    const j = await judge(msg.skill, msg.brief, msg.payload ?? { result: msg.result });
    const attestation = await attest(
      self.privateKey,
      { jobId: msg.jobId, skill: msg.skill, resultHash: msg.resultHash, agentId: self.agentId },
      j
    );
    emit("drift", j.verdict === "pass" ? colors.up : colors.amber, `attested ${msg.jobId}: ${j.verdict.toUpperCase()} (${j.score}) — ${j.reason}`);
    this.d.send(from, { kind: "job-attest", jobId: msg.jobId, attestation } satisfies JobMsg);
  }

  // --- BUYER: verify attestation, pay + feedback on PASS ----------------------
  private async onAttest(msg: Extract<JobMsg, { kind: "job-attest" }>): Promise<void> {
    const { emit, colors, self } = this.d;
    const job = this.jobs.get(msg.jobId);
    if (!job || !job.resultHash) return;
    const att = msg.attestation;
    job.attestation = att;

    const v = await verifyAttestation(att, job.resultHash);
    if (!v.ok) {
      job.status = "failed";
      emit("drift", colors.amber, `attestation rejected for ${msg.jobId}: ${v.reason}`);
      this.notifyWorker(job, "fail", v.reason);
      return;
    }
    emit("x402", colors.up, `✓ attestation verified · validator ${shortAddr(att.validator)}${att.agentId !== undefined ? ` #${att.agentId}` : ""}`);

    if (att.verdict === "fail") {
      job.status = "rejected";
      emit("drift", colors.amber, `validation FAIL (${att.score}) — not paying. ${att.reason}`);
      if (job.workerAgentId !== undefined) {
        await this.feedback(job, 0, att).catch(() => {});
      }
      this.notifyWorker(job, "fail", att.reason);
      return;
    }

    // PASS → pay the worker (x402 native AVAX) then post attested feedback.
    try {
      const req = buildAvaxRequirement({
        priceAvax: job.workerPrice,
        payTo: job.worker as `0x${string}`,
        resource: `job:${job.jobId}`,
        description: `${job.skill} job ${job.jobId}`,
      });
      const txHash = await payAvax(req, self.privateKey);
      job.txHash = txHash;
      emit("x402", colors.up, `✓ paid ${job.workerPrice} AVAX → ${shortAddr(job.worker)} · Avalanche Fuji`);
      this.d.sub(this.d.txUrl(txHash));

      if (job.workerAgentId !== undefined) {
        const fb = await this.feedback(job, att.score, att);
        emit("x402", colors.up, `★ attested feedback posted for worker #${job.workerAgentId}`);
        this.d.sub(this.d.txUrl(fb));
      }
      // Reward the validator too, so honest validators earn reputation.
      if (att.agentId !== undefined) {
        giveFeedback(self.privateKey, BigInt(att.agentId), 100, "validation").catch(() => {});
      }
      job.status = "settled";
      this.notifyWorker(job, "pass");
      this.d.onSettled?.();
    } catch (e) {
      job.status = "failed";
      emit("drift", colors.amber, `settlement failed for ${msg.jobId}: ${(e as Error).message.split("\n")[0]}`);
    }
  }

  // --- WORKER: receipt --------------------------------------------------------
  private onSettle(from: string, msg: Extract<JobMsg, { kind: "job-settle" }>): void {
    const { emit, colors } = this.d;
    if (msg.verdict === "pass") emit("inbox", colors.up, `job ${msg.jobId} settled ✓ paid by ${shortAddr(from)}`);
    else emit("inbox", colors.amber, `job ${msg.jobId} rejected by ${shortAddr(from)}${msg.reason ? ` — ${msg.reason}` : ""}`);
  }

  private notifyWorker(job: Job, verdict: "pass" | "fail", reason?: string): void {
    this.d.send(job.worker, {
      kind: "job-settle",
      jobId: job.jobId,
      verdict,
      txHash: job.txHash,
      feedbackTx: job.feedbackTx,
      reason,
    } satisfies JobMsg);
  }

  // Post feedback anchored to the validator's attestation (a short ref + the work
  // hash), so the on-chain reputation is provably backed by independent validation.
  private async feedback(job: Job, value: number, att: Attestation): Promise<`0x${string}`> {
    const ref = `attest:${att.validator}:${att.signature.slice(0, 18)}`;
    const hash = `0x${job.resultHash}` as `0x${string}`;
    const tx = await giveFeedback(this.d.self.privateKey, BigInt(job.workerAgentId!), value, job.skill, ref, hash);
    job.feedbackTx = tx;
    return tx;
  }

  // --- worker skill execution (delivered BEFORE payment) ----------------------
  private async work(skill: string, brief: string): Promise<{ result: string; payload?: unknown }> {
    const account = privateKeyToAccount(this.d.self.privateKey);
    if (skill === "trade-signal") {
      const signal = await generateSignal(brief);
      const message = `drift-signal:${signal.symbol}:${signal.direction}:${signal.horizonHours}:${signal.entryPrice}:${signal.issuedAt}`;
      const signature = await account.signMessage({ message });
      return { result: signal.rationale, payload: { signal: { ...signal, provider: this.d.self.addr, signature } } };
    }
    if (skill === "yield-allocator") {
      const allocation = await generateAllocation(brief);
      const message = `drift-yield:${allocation.capital}:${allocation.risk}:${allocation.blendedApy}:${allocation.issuedAt}`;
      const signature = await account.signMessage({ message });
      return { result: allocation.rationale, payload: { allocation: { ...allocation, provider: this.d.self.addr, signature } } };
    }
    if (!llmEnabled()) throw new Error("no LLM key — run `setup`");
    const result = await complete("You are a capable agent. Complete the task concisely and accurately.", brief);
    return { result: result ?? "" };
  }

  // Pick the highest-reputation live peer that serves `skill`, excluding addresses.
  private async pickBySkill(skill: string, exclude: string[]): Promise<Peer | null> {
    const cands = this.d
      .peers()
      .filter((p) => p.skills.includes(skill) && !exclude.includes(p.addr) && p.addr !== this.d.self.addr);
    if (!cands.length) return null;
    const ranked = await Promise.all(
      cands.map(async (p) => {
        let avg = -1;
        let count = -1;
        if (p.agentId !== undefined) {
          try {
            const r = await getReputation(BigInt(p.agentId));
            if (r) {
              avg = r.avg;
              count = r.count;
            }
          } catch {
            /* ignore */
          }
        }
        return { p, avg, count };
      })
    );
    ranked.sort((a, b) => b.avg - a.avg || b.count - a.count);
    return ranked[0].p;
  }
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
