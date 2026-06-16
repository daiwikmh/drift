// Agent-to-agent (A2A) wire protocol, carried over the WebSocket rendezvous relay.
// Agents dial OUT to the relay (so NAT/firewalls don't matter); the relay routes
// messages by agent address and gossips presence. The chain stays the source of
// truth for identity/reputation/payment — the relay is just a dumb live pipe.

export type Peer = {
  addr: string;
  name: string;
  skills: string[];
};

// client → relay
export type Hello = { type: "hello"; addr: string; name: string; skills: string[] };
export type ListPeers = { type: "list" };
export type SendMsg = { type: "send"; to: string; payload: unknown };
export type ClientMsg = Hello | ListPeers | SendMsg;

// relay → client
export type Welcome = { type: "welcome"; you: string };
export type Peers = { type: "peers"; peers: Peer[] };
export type Recv = { type: "recv"; from: string; payload: unknown };
export type Presence = { type: "presence"; event: "join" | "leave"; peer: Peer };
export type ServerMsg = Welcome | Peers | Recv | Presence;
