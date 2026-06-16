// The rendezvous relay: a thin WebSocket hub agents dial out to so they can reach
// each other across machines. It routes messages by agent address and gossips
// presence. It holds no trust — it cannot forge identity, reputation, or payments
// (those live on Avalanche). Swappable for libp2p later.
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMsg, Peer, ServerMsg } from "../a2a/types.js";

type Conn = { ws: WebSocket; peer: Peer };

export function startRelay(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port });
  const conns = new Map<string, Conn>(); // addr → connection

  const send = (ws: WebSocket, msg: ServerMsg) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };
  const broadcast = (msg: ServerMsg, exceptAddr?: string) => {
    for (const [addr, c] of conns) if (addr !== exceptAddr) send(c.ws, msg);
  };
  const peerList = (): Peer[] => [...conns.values()].map((c) => c.peer);

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
        const peer: Peer = { addr: msg.addr, name: msg.name, skills: msg.skills };
        conns.set(msg.addr, { ws, peer });
        send(ws, { type: "welcome", you: msg.addr });
        send(ws, { type: "peers", peers: peerList() });
        broadcast({ type: "presence", event: "join", peer }, msg.addr);
      } else if (msg.type === "list") {
        send(ws, { type: "peers", peers: peerList() });
      } else if (msg.type === "send") {
        const target = conns.get(msg.to);
        if (target && self) {
          send(target.ws, { type: "recv", from: self, payload: msg.payload });
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
