// A public, self-hosted MCP "Streamable HTTP" echo server, so the live (Vercel)
// deployment has a reachable MCP endpoint to demo the pay-per-call gateway against
// — no localhost, no external hosting. List it as an MCP endpoint with the URL
// https://<your-app>/api/demo-mcp, then pay & call it from the dashboard.
import { NextRequest, NextResponse } from "next/server";

type Rpc = { id?: number | string; method?: string; params?: { name?: string; arguments?: { text?: string } } };

export async function POST(req: NextRequest) {
  let msg: Rpc;
  try {
    msg = (await req.json()) as Rpc;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { id, method, params } = msg ?? {};

  // Notifications (no id), e.g. notifications/initialized — just acknowledge.
  if (id === undefined) return new NextResponse(null, { status: 202 });

  if (method === "initialize") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "drift-demo-echo", version: "1.0.0" },
        },
      },
      { headers: { "Mcp-Session-Id": "drift-demo" } }
    );
  }

  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "echo",
            description: "Echoes the provided text back",
            inputSchema: { type: "object", properties: { text: { type: "string" } } },
          },
        ],
      },
    });
  }

  if (method === "tools/call") {
    if (params?.name === "echo") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: `echo: ${params?.arguments?.text ?? ""}` }] },
      });
    }
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `unknown tool ${params?.name}` } });
  }

  return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `unknown method ${method}` } });
}
