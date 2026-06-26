// Minimal MCP "Streamable HTTP" client for the pay-per-call gateway. Each paid
// call runs one stateless cycle: initialize -> notifications/initialized -> the
// buyer's tools/call (or tools/list), parsing either a JSON or an SSE response.
// No session is held across calls (serverless-friendly) — the handshake re-runs
// every time. stdio MCP servers are out of scope: they expose no URL.
const PROTOCOL_VERSION = "2025-06-18";

type JsonRpc = {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type RpcCycle = { messages: JsonRpc[]; sessionId: string | null; status: number };

function parseSse(text: string): JsonRpc[] {
  const out: JsonRpc[] = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n")
      .trim();
    if (!data) continue;
    try {
      out.push(JSON.parse(data) as JsonRpc);
    } catch {
      /* skip non-JSON events (comments, pings) */
    }
  }
  return out;
}

export type AuthHeader = { name: string; value: string };

async function rpc(
  url: string,
  sessionId: string | null,
  message: JsonRpc,
  auth?: AuthHeader
): Promise<RpcCycle> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  if (auth) headers[auth.name] = auth.value;

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(message) });
  const newSession = res.headers.get("mcp-session-id") ?? sessionId;
  const ct = res.headers.get("content-type") ?? "";

  if (res.status === 202 || res.status === 204) {
    return { messages: [], sessionId: newSession, status: res.status };
  }

  const text = await res.text();
  let messages: JsonRpc[] = [];
  if (ct.includes("text/event-stream")) {
    messages = parseSse(text);
  } else if (text.trim()) {
    try {
      const parsed = JSON.parse(text);
      messages = Array.isArray(parsed) ? (parsed as JsonRpc[]) : [parsed as JsonRpc];
    } catch {
      /* leave empty — surfaced as "no response" below */
    }
  }
  return { messages, sessionId: newSession, status: res.status };
}

// Translate the buyer's body into a JSON-RPC call. Accepts an explicit
// { method, params } or the shorthand { tool|name, arguments } -> tools/call.
// An empty/unknown body falls back to tools/list so the call still returns something.
function buildCall(body: unknown): { method: string; params: unknown } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.method === "string") return { method: b.method, params: b.params ?? {} };
  const name = (b.tool ?? b.name) as string | undefined;
  if (name) return { method: "tools/call", params: { name, arguments: b.arguments ?? {} } };
  return { method: "tools/list", params: {} };
}

export type McpResult = { ok: true; result: unknown } | { ok: false; error: string; status?: number };

export async function callMcp(url: string, body: unknown, auth?: AuthHeader): Promise<McpResult> {
  try {
    // 1) initialize
    const init = await rpc(
      url,
      null,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "drift-gateway", version: "1.0.0" },
        },
      },
      auth
    );
    if (init.status >= 400) return { ok: false, error: `initialize HTTP ${init.status}`, status: init.status };
    const initMsg = init.messages.find((m) => m.id === 1);
    if (initMsg?.error) return { ok: false, error: `initialize: ${initMsg.error.message}` };

    const sessionId = init.sessionId;

    // 2) initialized notification (best-effort; servers may 202 or ignore)
    await rpc(url, sessionId, { jsonrpc: "2.0", method: "notifications/initialized" }, auth).catch(() => {});

    // 3) the buyer's call
    const { method, params } = buildCall(body);
    const call = await rpc(url, sessionId, { jsonrpc: "2.0", id: 2, method, params }, auth);
    if (call.status >= 400) return { ok: false, error: `${method} HTTP ${call.status}`, status: call.status };
    const msg = call.messages.find((m) => m.id === 2);
    if (!msg) return { ok: false, error: `no JSON-RPC response for ${method}` };
    if (msg.error) return { ok: false, error: `${method}: ${msg.error.message}` };
    return { ok: true, result: msg.result };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
