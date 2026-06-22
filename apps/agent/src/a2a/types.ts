// Agent-to-agent (A2A) wire protocol, carried over the WebSocket rendezvous relay.
// Agents dial OUT to the relay (so NAT/firewalls don't matter); the relay routes
// messages by agent address and gossips presence. The chain stays the source of
// truth for identity/reputation/payment — the relay is just a dumb live pipe.

export type Peer = {
  addr: string;
  name: string;
  skills: string[];
  endpoint?: string; // x402 compute endpoint, if this agent sells compute
  priceUsdc?: number; // price per call (USDC rail)
  priceAvax?: number; // price per call (native AVAX rail)
  model?: string; // the model this provider serves
  agentId?: number; // ERC-8004 identity, if registered (lets peers verify on-chain)
};

// client → relay
export type Hello = {
  type: "hello";
  addr: string;
  name: string;
  skills: string[];
  endpoint?: string;
  priceUsdc?: number;
  priceAvax?: number;
  model?: string;
  agentId?: number;
};
export type ListPeers = { type: "list" };
export type SendMsg = { type: "send"; to: string; payload: unknown };
// provider → relay: the answer to a proxied inference request
export type InferResult = {
  type: "infer-result";
  id: string;
  status: number;
  body: unknown;
  paymentResponse?: string;
};
export type ClientMsg = Hello | ListPeers | SendMsg | InferResult;

// relay → client
export type Welcome = { type: "welcome"; you: string };
export type Peers = { type: "peers"; peers: Peer[] };
export type Recv = { type: "recv"; from: string; payload: unknown };
export type Presence = { type: "presence"; event: "join" | "leave"; peer: Peer };
// relay → provider: a buyer's inference request, proxied over the WS the provider
// already holds (so providers need no public URL).
export type Infer = { type: "infer"; id: string; payment?: string; body: unknown };
export type ServerMsg = Welcome | Peers | Recv | Presence | Infer;
