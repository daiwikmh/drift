// A2A client: each agent dials out to the relay, announces itself, and can send
// direct messages to peers by address + react to presence. Auto-reconnects.
import { WebSocket } from "ws";
import type { Peer, ServerMsg } from "./types.js";

type Handlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onPeers?: (peers: Peer[]) => void;
  onPresence?: (event: "join" | "leave", peer: Peer) => void;
  onMessage?: (from: string, payload: unknown) => void;
  onInfer?: (id: string, payment: string | undefined, body: unknown) => void;
};

export class A2AClient {
  private ws: WebSocket | null = null;
  private closed = false;

  constructor(
    private url: string,
    private self: Peer,
    private h: Handlers = {}
  ) {}

  connect() {
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.on("open", () => {
      this.announce();
      this.h.onOpen?.();
    });

    ws.on("message", (raw) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === "peers") this.h.onPeers?.(msg.peers);
      else if (msg.type === "presence") this.h.onPresence?.(msg.event, msg.peer);
      else if (msg.type === "recv") this.h.onMessage?.(msg.from, msg.payload);
      else if (msg.type === "infer") this.h.onInfer?.(msg.id, msg.payment, msg.body);
    });

    ws.on("close", () => {
      this.h.onClose?.();
      if (!this.closed) setTimeout(() => this.connect(), 1500); // reconnect
    });

    ws.on("error", () => {
      /* surfaced via close */
    });
  }

  // (Re)broadcast this agent's presence — called on connect, and again after the
  // agent registers on-chain so peers learn its fresh ERC-8004 agentId.
  announce() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: "hello",
        addr: this.self.addr,
        name: this.self.name,
        skills: this.self.skills,
        endpoint: this.self.endpoint,
        priceUsdc: this.self.priceUsdc,
        priceAvax: this.self.priceAvax,
        model: this.self.model,
        agentId: this.self.agentId,
      })
    );
  }

  send(to: string, payload: unknown) {
    this.ws?.send(JSON.stringify({ type: "send", to, payload }));
  }

  // Reply to a relay-proxied inference request.
  inferResult(id: string, status: number, body: unknown, paymentResponse?: string) {
    this.ws?.send(JSON.stringify({ type: "infer-result", id, status, body, paymentResponse }));
  }

  list() {
    this.ws?.send(JSON.stringify({ type: "list" }));
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}
