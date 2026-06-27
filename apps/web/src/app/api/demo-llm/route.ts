// A real LLM-inference upstream powered by NVIDIA NIM (OpenAI-compatible). Listed
// as a pay-per-call HTTP endpoint, it turns a paid call into an actual completion.
//
// The key lives ONLY in env (NVIDIA_API_KEY on Vercel) — never in code. When
// DEMO_LLM_SECRET is set, the route requires that secret in a header, so only the
// gateway (which injects the owner's auth header) gets through — nobody can hit
// this route directly and burn the key for free. List it with an auth header
// `x-drift-secret: <DEMO_LLM_SECRET>` and the gateway adds it on every paid call.
import { NextRequest, NextResponse } from "next/server";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  const secret = process.env.DEMO_LLM_SECRET;
  if (secret) {
    const got = req.headers.get("x-drift-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (got !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = process.env.NVIDIA_API_KEY;
  if (!key) return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 503 });

  let body: { prompt?: string; model?: string };
  try {
    body = (await req.json()) as { prompt?: string; model?: string };
  } catch {
    body = {};
  }
  const prompt = (body.prompt ?? "").toString().trim();
  if (!prompt) return NextResponse.json({ error: "missing 'prompt'" }, { status: 400 });
  const model = body.model || process.env.DEMO_LLM_MODEL || "meta/llama-3.1-8b-instruct";

  let r: Response;
  try {
    r = await fetch(NIM_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a concise, helpful assistant." },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: `nvidia request failed: ${(e as Error).message}` }, { status: 502 });
  }

  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 300);
    return NextResponse.json({ error: `nvidia ${r.status}`, detail }, { status: 502 });
  }

  const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return NextResponse.json({ model, result: j.choices?.[0]?.message?.content?.trim() ?? "" });
}
