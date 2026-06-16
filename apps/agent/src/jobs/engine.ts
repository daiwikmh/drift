// The job engine drives both sides of a hire. One agent can be both a client
// (initiates `hire`) and a worker (auto-responds to incoming requests). It emits
// anima-style feed lines as it runs. On-chain steps (escrow / settlement / trust)
// are labeled "pending on-chain" until Checkpoints 4–5 wire ERC-8004 + x402 —
// nothing here fabricates a tx hash or a result.
import { createHash } from "node:crypto";
import type { Peer } from "../a2a/types.js";
import type {
  JobDeliver,
  JobHire,
  JobMsg,
  JobQuote,
  JobRequest,
} from "./protocol.js";
import { complete } from "../llm.js";
import { shortAddr } from "../identity.js";

type Self = { addr: string; name: string; skills: string[] };
type Emit = (actor: string, color: string, text: string) => void;
type EmitSub = (text: string) => void;
type Send = (to: string, payload: unknown) => void;

const C = {
  own: "#34d399", // the agent's own tool-calls (green)
  mkt: "#9aa8f0", // marketplace events (periwinkle)
  inbox: "#9ca3af", // incoming messages (grey)
  warn: "#fbbf24",
};

// The worker's quote policy — a real offer, not placeholder data.
const QUOTE = { priceUsdc: 5, etaHours: 4 };

export class JobEngine {
  private clientJobs = new Map<string, { worker: Peer; skill: string; brief: string }>();
  private workerJobs = new Map<string, { client: string; skill: string; brief: string }>();

  constructor(
    private self: Self,
    private send: Send,
    private emit: Emit,
    private emitSub: EmitSub,
    private getPeers: () => Peer[],
    private onComplete?: (jobId: string) => void
  ) {}

  // ---- client role -------------------------------------------------------
  hire(skill: string, brief: string) {
    const cands = this.getPeers().filter((p) => p.skills.includes(skill));
    this.emit("drift", C.own, `● market.list skill="${skill}" limit=${cands.length}`);
    cands.forEach((p, i) =>
      this.emitSub(`${i + 1}. ${p.name} · ${p.skills.join(",")} · ${shortAddr(p.addr)}  (rep pending on-chain)`)
    );
    if (cands.length === 0) {
      this.emit("mkt", C.warn, `no agent offers "${skill}" — is a worker online?`);
      return;
    }
    const worker = cands[0]; // ranking by on-chain reputation arrives in Checkpoint 4
    const jobId = "job-" + Math.random().toString(36).slice(2, 7);
    this.clientJobs.set(jobId, { worker, skill, brief });
    this.emit("drift", C.own, `● agent.message to="${worker.name}"`);
    this.emitSub(`sent · ${jobId} · "${brief}"`);
    this.send(worker.addr, { kind: "job.request", jobId, skill, brief });
  }

  // ---- dispatch ----------------------------------------------------------
  handle(from: string, msg: JobMsg) {
    switch (msg.kind) {
      case "job.request":
        return this.onRequest(from, msg);
      case "job.quote":
        return this.onQuote(msg);
      case "job.hire":
        return this.onHire(msg);
      case "job.deliver":
        return this.onDeliver(msg);
      case "job.accept":
        return this.emit("mkt", C.mkt, `settled · ${msg.jobId} · +${QUOTE.priceUsdc} USDC (pending on-chain)`);
      case "job.decline":
        return this.emit("mkt", C.warn, `declined · ${msg.reason}`);
    }
  }

  // ---- worker role -------------------------------------------------------
  private onRequest(from: string, msg: JobRequest) {
    if (!this.self.skills.includes(msg.skill)) {
      this.send(from, { kind: "job.decline", jobId: msg.jobId, reason: `no skill ${msg.skill}` });
      return;
    }
    this.workerJobs.set(msg.jobId, { client: from, skill: msg.skill, brief: msg.brief });
    this.emit("inbox", C.inbox, `from ${shortAddr(from)} · "${msg.brief}"`);
    this.emit("drift", C.own, `● market.history peer="${shortAddr(from)}"`);
    this.emitSub("trust check pending on-chain (ERC-8004)");
    this.emit("drift", C.own, "● agent.message reply=true");
    this.emitSub(`quote ${QUOTE.priceUsdc} USDC · ${QUOTE.etaHours}h`);
    this.send(from, {
      kind: "job.quote",
      jobId: msg.jobId,
      priceUsdc: QUOTE.priceUsdc,
      etaHours: QUOTE.etaHours,
    });
  }

  private async onHire(msg: JobHire) {
    const job = this.workerJobs.get(msg.jobId);
    if (!job) return;
    this.emit("mkt", C.mkt, `hired · ${msg.jobId} · ${QUOTE.priceUsdc} USDC escrow (pending on-chain)`);
    this.emit("drift", C.own, `● working: ${job.skill}`);
    let summary: string | null = null;
    try {
      summary = await complete(`You are a ${job.skill} agent. Be concise and concrete.`, job.brief);
    } catch {
      summary = null;
    }
    if (!summary) {
      summary = `(skill "${job.skill}" executor not wired — no LLM key or offline; brief: ${job.brief})`;
    }
    const resultRef = "sha256:" + createHash("sha256").update(summary).digest("hex").slice(0, 16);
    this.emitSub(`result ${resultRef}`);
    this.emit("drift", C.own, `● market.deliver job=${msg.jobId}`);
    this.send(job.client, { kind: "job.deliver", jobId: msg.jobId, summary, resultRef });
  }

  // ---- client role (result) ---------------------------------------------
  private onQuote(msg: JobQuote) {
    const job = this.clientJobs.get(msg.jobId);
    if (!job) return;
    this.emit("inbox", C.inbox, `from ${job.worker.name} · quote ${msg.priceUsdc} USDC · ${msg.etaHours}h`);
    this.emit("drift", C.own, `● market.createJob price=${msg.priceUsdc} escrow=true`);
    this.emitSub("escrow lock pending on-chain (x402/USDC)");
    this.send(job.worker.addr, { kind: "job.hire", jobId: msg.jobId });
  }

  private onDeliver(msg: JobDeliver) {
    const job = this.clientJobs.get(msg.jobId);
    if (!job) return;
    this.emit("inbox", C.inbox, `from ${job.worker.name} · delivered ${msg.resultRef}`);
    this.emit("drift", C.own, `● market.acceptResult job=${msg.jobId}`);
    this.emitSub(
      `settle ${QUOTE.priceUsdc} USDC → ${job.worker.name} · feedback → reputation · both pending on-chain`
    );
    this.send(job.worker.addr, { kind: "job.accept", jobId: msg.jobId });
    this.emit("drift", C.own, `hired ${job.worker.name} for ${QUOTE.priceUsdc} USDC`);
    this.emitSub(msg.summary.slice(0, 220));
    this.onComplete?.(msg.jobId);
  }
}
