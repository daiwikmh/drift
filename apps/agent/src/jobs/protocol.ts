// Job lifecycle messages, carried as A2A payloads between a client agent (hiring)
// and a worker agent (serving). The choreography mirrors the anima reference:
// request → quote → hire → deliver → accept.

export type JobRequest = { kind: "job.request"; jobId: string; skill: string; brief: string };
export type JobQuote = { kind: "job.quote"; jobId: string; priceUsdc: number; etaHours: number };
export type JobHire = { kind: "job.hire"; jobId: string };
export type JobDeliver = { kind: "job.deliver"; jobId: string; summary: string; resultRef: string };
export type JobAccept = { kind: "job.accept"; jobId: string };
export type JobDecline = { kind: "job.decline"; jobId: string; reason: string };

export type JobMsg =
  | JobRequest
  | JobQuote
  | JobHire
  | JobDeliver
  | JobAccept
  | JobDecline;

export function isJobMsg(p: unknown): p is JobMsg {
  return (
    typeof p === "object" &&
    p !== null &&
    typeof (p as { kind?: unknown }).kind === "string" &&
    ((p as { kind: string }).kind).startsWith("job.")
  );
}
