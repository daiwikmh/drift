// The rendezvous relay: a thin hub agents dial out to so they can reach each other
// across machines, and the wire through which buyers reach providers. It routes A2A
// messages by address, gossips presence, and PROXIES inference: a buyer's HTTP
// `POST /infer/:addr` is forwarded over the WebSocket the provider already holds and
// the reply streamed back — so a provider on a laptop/NAT needs no public URL. The
// relay holds no trust: it can't forge identity, reputation, or payments (those live
// on Avalanche) — it only moves bytes and reports who is live.
import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMsg, Peer, ServerMsg } from "../a2a/types.js";

type Conn = { ws: WebSocket; peer: Peer };

const INFER_TIMEOUT_MS = 90_000;

export function startRelay(port: number): WebSocketServer {
  const conns = new Map<string, Conn>(); // addr → connection
  const peerList = (): Peer[] => [...conns.values()].map((c) => c.peer);

  // In-flight proxied inference requests, awaiting the provider's WS reply.
  const pending = new Map<string, { res: ServerResponse; timer: NodeJS.Timeout }>();

  const cors = (res: ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT");
    res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE");
  };
  const sendJson = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
    cors(res);
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.setHeader("Content-Type", "application/json");
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };

  const http = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      cors(res);
      res.statusCode = 204;
      return res.end();
    }

    // Discovery: providers currently online (for the web + any non-WS client).
    if (req.method === "GET" && req.url?.startsWith("/providers")) {
      return sendJson(res, 200, { providers: peerList().filter((p) => p.skills.length) });
    }

    // Proxied inference: POST /infer/<provider-address>
    const m = req.url?.match(/^\/infer\/(0x[0-9a-fA-F]{40})/);
    if (req.method === "POST" && m) {
      const addr = m[1].toLowerCase();
      const target = [...conns.values()].find((c) => c.peer.addr.toLowerCase() === addr);
      if (!target) return sendJson(res, 404, { error: "provider offline" });

      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      let body: unknown = {};
      try {
        body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
      } catch {
        return sendJson(res, 400, { error: "bad JSON" });
      }

      const id = randomUUID();
      const payment = typeof req.headers["x-payment"] === "string" ? (req.headers["x-payment"] as string) : undefined;
      const timer = setTimeout(() => {
        pending.delete(id);
        sendJson(res, 504, { error: "provider timed out" });
      }, INFER_TIMEOUT_MS);
      pending.set(id, { res, timer });
      target.ws.send(JSON.stringify({ type: "infer", id, payment, body } satisfies ServerMsg));
      return;
    }

    res.statusCode = 404;
    res.end("drift relay");
  });

  http.listen(port);
  const wss = new WebSocketServer({ server: http });

  const send = (ws: WebSocket, msg: ServerMsg) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };
  const broadcast = (msg: ServerMsg, exceptAddr?: string) => {
    for (const [addr, c] of conns) if (addr !== exceptAddr) send(c.ws, msg);
  };

  wss.on("connection", (ws) => {
    let self: string | null = null;

    ws.on("message", (raw) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "hello") {
        self = msg.addr;
        const peer: Peer = {
          addr: msg.addr,
          name: msg.name,
          skills: msg.skills,
          endpoint: msg.endpoint,
          priceUsdc: msg.priceUsdc,
          priceAvax: msg.priceAvax,
          model: msg.model,
          agentId: msg.agentId,
        };
        conns.set(msg.addr, { ws, peer });
        send(ws, { type: "welcome", you: msg.addr });
        send(ws, { type: "peers", peers: peerList() });
        broadcast({ type: "presence", event: "join", peer }, msg.addr);
      } else if (msg.type === "list") {
        send(ws, { type: "peers", peers: peerList() });
      } else if (msg.type === "send") {
        const target = conns.get(msg.to);
        if (target && self) send(target.ws, { type: "recv", from: self, payload: msg.payload });
      } else if (msg.type === "infer-result") {
        // A provider answering a proxied inference — complete the buyer's HTTP req.
        const waiting = pending.get(msg.id);
        if (waiting) {
          clearTimeout(waiting.timer);
          pending.delete(msg.id);
          const headers: Record<string, string> = msg.paymentResponse
            ? { "X-PAYMENT-RESPONSE": msg.paymentResponse }
            : {};
          sendJson(waiting.res, msg.status, msg.body, headers);
        }
      }
    });

    ws.on("close", () => {
      if (self) {
        const c = conns.get(self);
        conns.delete(self);
        if (c) broadcast({ type: "presence", event: "leave", peer: c.peer });
      }
    });
  });

  return wss;
}
