import { NextResponse } from "next/server";
import { recordPipelineCall } from "@/lib/server/registry";

// Called once by the browser after a composition finishes running all of its
// steps (each step already paid for + verified individually via /api/call/*)
// — this just increments the "times run" counter, no payment here.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await recordPipelineCall(id);
  return NextResponse.json({ ok: true });
}
