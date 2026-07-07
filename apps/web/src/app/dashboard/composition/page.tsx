"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Section, btnPrimary, btnGhost, fieldCls, microLabel } from "@/components/dashboard/ui";
import { listListings, type Listing } from "@/lib/listings";
import { listPipelines, createPipeline, runPipeline, type Pipeline, type PipelineRunStep } from "@/lib/pipelines";

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

export default function Composition() {
  const { account, connect, connecting } = useWallet();
  const [listings, setListings] = useState<Listing[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const refresh = useCallback(() => {
    listListings().then(setListings).catch(() => setListings([]));
    listPipelines().then(setPipelines).catch(() => setPipelines([]));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const nameOf = (id: string) => listings.find((l) => l.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-3xl px-8 py-9">
      <h1 className="font-display text-2xl tracking-tight">Composition</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/45">
        Chain two or more listings into one pipeline — each step&rsquo;s response feeds the next step&rsquo;s request.
        Every step is still its own real pay-per-call purchase; running a composition just pays for each step in
        order and passes the output along. No escrow, no custody — you sign one native CSPR transfer per step.
      </p>

      <BuildForm account={account} connect={connect} connecting={connecting} listings={listings} onCreated={refresh} />

      <Section label="Saved compositions" />
      {pipelines.length === 0 ? (
        <Card>
          <p className="text-sm text-white/40">No compositions yet — build one above from at least two listings.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pipelines.map((p) => (
            <PipelineCard key={p.id} pipeline={p} nameOf={nameOf} account={account} connect={connect} connecting={connecting} />
          ))}
        </div>
      )}
    </div>
  );
}

function BuildForm({
  account,
  connect,
  connecting,
  listings,
  onCreated,
}: {
  account: string | null;
  connect: () => void;
  connecting: boolean;
  listings: Listing[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<{ listingId: string; bodyTemplate: string }[]>([
    { listingId: "", bodyTemplate: "{}" },
    { listingId: "", bodyTemplate: '{"prompt": "{{previous.result}}"}' },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const addStep = () => setSteps((s) => [...s, { listingId: "", bodyTemplate: '{"prompt": "{{previous.result}}"}' }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, patch: Partial<{ listingId: string; bodyTemplate: string }>) =>
    setSteps((s) => s.map((step, idx) => (idx === i ? { ...step, ...patch } : step)));

  const valid = name.trim() && steps.length >= 2 && steps.every((s) => s.listingId && s.bodyTemplate.trim());

  const submit = async () => {
    if (!account || !valid) return;
    setBusy(true);
    setErr(null);
    setDone(false);
    try {
      await createPipeline({ name: name.trim(), description: description.trim(), owner: account, steps });
      setName("");
      setDescription("");
      setSteps([
        { listingId: "", bodyTemplate: "{}" },
        { listingId: "", bodyTemplate: '{"prompt": "{{previous.result}}"}' },
      ]);
      setDone(true);
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Build a composition"
      sub={`Step 1's body is sent as-is. Later steps may reference the previous step's JSON response with {{previous}} (whole thing) or {{previous.someKey}} (one field) — e.g. {"prompt": "{{previous.result}}"}.`}
      className="mt-7"
    >
      {!account ? (
        <button onClick={connect} disabled={connecting} className={`${btnPrimary} mt-4`}>
          {connecting ? "Connecting…" : "Connect wallet to build"}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={microLabel}>Name</span>
              <input className={`${fieldCls} mt-1.5`} placeholder="weather-then-summarize" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className={microLabel}>Description (optional)</span>
              <input className={`${fieldCls} mt-1.5`} placeholder="What does this pipeline do?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className={microLabel}>Step {i + 1}</span>
                  {steps.length > 2 && (
                    <button onClick={() => removeStep(i)} className="text-[11px] text-white/30 hover:text-[#e84142]">
                      remove
                    </button>
                  )}
                </div>
                <select
                  className={`${fieldCls} mt-1.5`}
                  value={step.listingId}
                  onChange={(e) => updateStep(i, { listingId: e.target.value })}
                >
                  <option value="">Pick a listing…</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.priceCspr.toFixed(2)} CSPR
                    </option>
                  ))}
                </select>
                <textarea
                  className={`${fieldCls} mt-1.5 h-16 font-mono text-[12px]`}
                  value={step.bodyTemplate}
                  onChange={(e) => updateStep(i, { bodyTemplate: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={addStep} className={btnGhost}>
              + Add step
            </button>
            <button onClick={submit} disabled={!valid || busy} className={btnPrimary}>
              {busy ? "Saving…" : "Save composition"}
            </button>
            {done && <span className="text-[13px] text-emerald-400">Saved.</span>}
            {err && <span className="text-[13px] text-[#e84142]">{err}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}

function PipelineCard({
  pipeline,
  nameOf,
  account,
  connect,
  connecting,
}: {
  pipeline: Pipeline;
  nameOf: (id: string) => string;
  account: string | null;
  connect: () => void;
  connecting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [firstBody, setFirstBody] = useState(pipeline.steps[0]?.bodyTemplate ?? "{}");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineRunStep[]>([]);

  const run = async () => {
    if (!account) return;
    setRunning(true);
    setSteps([]);
    const withFirstBody: Pipeline = { ...pipeline, steps: [{ ...pipeline.steps[0], bodyTemplate: firstBody }, ...pipeline.steps.slice(1)] };
    await runPipeline(withFirstBody, account, (i, step) => setSteps((s) => [...s.slice(0, i), step]));
    setRunning(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-white">{pipeline.name}</h3>
          {pipeline.description && <p className="mt-1 text-[13px] text-white/45">{pipeline.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/35">
            {pipeline.steps.map((s, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-white/60">{nameOf(s.listingId)}</span>
                {i < pipeline.steps.length - 1 && <span>→</span>}
              </span>
            ))}
            <span className="ml-2">{pipeline.calls} runs</span>
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)} className={btnGhost}>
          {open ? "Close" : "Run"}
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-white/10 pt-4">
          {!account ? (
            <button onClick={connect} disabled={connecting} className={btnPrimary}>
              {connecting ? "Connecting…" : "Connect wallet to run"}
            </button>
          ) : (
            <>
              <span className={microLabel}>Step 1 request body</span>
              <textarea className={`${fieldCls} mt-1.5 h-16 font-mono text-[12px]`} value={firstBody} onChange={(e) => setFirstBody(e.target.value)} />
              <button onClick={run} disabled={running} className={`${btnPrimary} mt-3`}>
                {running ? "Running…" : `Run ${pipeline.steps.length} steps`}
              </button>

              {steps.length > 0 && (
                <div className="mt-4 space-y-3">
                  {steps.map((s, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 text-[12px]">
                      <div className="mb-1.5 flex items-center gap-2 text-white/40">
                        <span className="font-mono">
                          {i + 1}. {nameOf(s.listingId)}
                        </span>
                        {s.txHash && <span className="text-emerald-400/80">settled · {short(s.txHash)}</span>}
                        {s.error && <span className="text-[#e84142]">failed</span>}
                      </div>
                      <pre className="overflow-auto whitespace-pre-wrap text-white/75">
                        {s.error ?? JSON.stringify(s.response, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
