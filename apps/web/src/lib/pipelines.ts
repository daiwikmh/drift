// Browser client for compositions (pipelines): a saved chain of existing
// listings, run one after another. No new payment mechanism — each step is a
// completely normal pay-per-call purchase (lib/listings.ts's callListing),
// just run in sequence with the previous step's response fed into the next
// step's request body via a small template substitution.
import { callListing } from "./listings";
import type { CasperAccount } from "./casper";

export type PipelineStep = { listingId: string; bodyTemplate: string };

export type Pipeline = {
  id: string;
  name: string;
  description: string;
  owner: CasperAccount;
  steps: PipelineStep[];
  createdAt: number;
  calls: number;
};

export type NewPipeline = {
  name: string;
  description: string;
  owner: CasperAccount;
  steps: PipelineStep[];
};

export async function listPipelines(): Promise<Pipeline[]> {
  const r = await fetch("/api/pipelines");
  if (!r.ok) throw new Error(`pipelines API returned ${r.status}`);
  const j = (await r.json()) as { pipelines?: Pipeline[] };
  return j.pipelines ?? [];
}

export async function createPipeline(input: NewPipeline): Promise<Pipeline> {
  const r = await fetch("/api/pipelines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `create failed ${r.status}`);
  return (j as { pipeline: Pipeline }).pipeline;
}

async function recordRun(id: string): Promise<void> {
  await fetch(`/api/pipelines/${id}/record`, { method: "POST" }).catch(() => {});
}

// Replaces "{{previous}}" (the whole prior response) or "{{previous.someKey}}"
// (one top-level field of it) with a properly JSON-encoded value, whether or
// not the template author quoted the placeholder — so both
// `{"prompt": "{{previous.result}}"}` and `{"prompt": {{previous.result}}}`
// produce valid JSON either way.
export function fillTemplate(template: string, previous: unknown): string {
  return template.replace(/"?\{\{\s*previous(?:\.([a-zA-Z0-9_]+))?\s*\}\}"?/g, (_match, key?: string) => {
    const value = key ? (previous as Record<string, unknown> | null | undefined)?.[key] : previous;
    return JSON.stringify(value ?? null);
  });
}

export type PipelineRunStep = {
  listingId: string;
  request: unknown;
  response?: unknown;
  txHash?: string;
  error?: string;
};

// Runs every step in order, paying for each as it goes. Stops at the first
// failed step (no refund logic needed — earlier steps already succeeded and
// paid out for real work actually done).
export async function runPipeline(
  pipeline: Pipeline,
  account: CasperAccount,
  onStep?: (index: number, step: PipelineRunStep) => void
): Promise<PipelineRunStep[]> {
  const results: PipelineRunStep[] = [];
  let previous: unknown;
  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    const filled = fillTemplate(step.bodyTemplate, previous);
    let body: unknown;
    try {
      body = filled.trim() ? JSON.parse(filled) : {};
    } catch {
      const result: PipelineRunStep = { listingId: step.listingId, request: filled, error: "bodyTemplate is not valid JSON after substitution" };
      results.push(result);
      onStep?.(i, result);
      break;
    }
    try {
      const r = await callListing(step.listingId, body, account);
      previous = r.json;
      const result: PipelineRunStep = { listingId: step.listingId, request: body, response: r.json, txHash: r.txHash };
      results.push(result);
      onStep?.(i, result);
    } catch (e) {
      const result: PipelineRunStep = { listingId: step.listingId, request: body, error: (e as Error).message };
      results.push(result);
      onStep?.(i, result);
      break;
    }
  }
  if (results.length && !results[results.length - 1].error) await recordRun(pipeline.id);
  return results;
}
