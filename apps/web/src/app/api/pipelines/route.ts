import { NextRequest, NextResponse } from "next/server";
import { listPipelines, createPipeline } from "@/lib/server/registry";

export async function GET() {
  return NextResponse.json({ pipelines: await listPipelines() });
}

export async function POST(req: NextRequest) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "bad JSON" }, { status: 400 });
  }
  const { pipeline, error } = await createPipeline(input);
  if (error || !pipeline) {
    return NextResponse.json({ error: error ?? "invalid composition" }, { status: 400 });
  }
  return NextResponse.json({ pipeline });
}
