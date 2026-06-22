// In-browser provider: makes the whole app web-only. A tab opens a WebSocket to
// the relay, announces itself, and answers inference requests while open. It accepts
// NATIVE AVAX only — the buyer has already paid, so the provider just verifies the
// transfer on-chain (no per-call signing popups, no gas). trade-signal works with
// no key (Bybit + momentum rule); llm-inference uses a client-side OpenRouter key.
import { createPublicClient, http, parseEther } from "viem";
import { avalancheFuji } from "viem/chains";
import { RELAY_HTTP, RELAY_WS } from "./market";
import { generateSignal } from "./signals";
import { generateAllocation } from "./yield";

const publicClient = createPublicClient({ chain: avalancheFuji, transport: http("https://api.avax-test.network/ext/bc/C/rpc") });

export type ProviderConfig = {
  account: `0x${string}`;
  name: string;
  skill: "trade-signal" | "llm-inference" | "yield-allocator";
  priceAvax: number;
  model?: string;
  openrouterKey?: string;
};

export type Hooks = {
  onLog: (line: string, kind?: "in" | "ok" | "warn") => void;
  onServed: () => void;
  onStatus: (s: "live" | "offline" | "connecting") => void;
};

async function callOpenRouter(key: string, model: string, system: string, user: string): Promise<string | null> {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://drift",
      "X-Title": "DRIFT",
    },
    body: JSON.stringify({
      model: model || "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 400,
    }),
  });
  if (!r.ok) throw new Error(`openrouter ${r.status}`);
  const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content?.trim() ?? null;
}

export function startProvider(cfg: ProviderConfig, hooks: Hooks): { stop: () => void } {
  const consumed = new Set<string>();
  const resource = `${RELAY_HTTP}/infer/${cfg.account}`;
  const llm = cfg.openrouterKey ? (s: string, u: string) => callOpenRouter(cfg.openrouterKey!, cfg.model || "openai/gpt-4o-mini", s, u) : undefined;
  let stopped = false;
  let ws: WebSocket | null = null;

  const avaxReq = () => ({
    scheme: "avax-native",
    network: "avalanche-fuji",
    chainId: 43113,
    maxAmountRequired: parseEther(String(cfg.priceAvax)).toString(),
    payTo: cfg.account,
    resource,
    description: `${cfg.skill} by ${cfg.name}`,
  });

  const connect = () => {
    hooks.onStatus("connecting");
    ws = new WebSocket(RELAY_WS);

    ws.onopen = () => {
      ws!.send(
        JSON.stringify({
          type: "hello",
          addr: cfg.account,
          name: cfg.name,
          skills: [cfg.skill],
          priceAvax: cfg.priceAvax,
          model: cfg.model || (cfg.skill === "llm-inference" ? "openrouter" : cfg.skill === "yield-allocator" ? "defillama" : "bybit + rule"),
        })
      );
      hooks.onStatus("live");
      hooks.onLog(`● live on the relay as “${cfg.name}” — ${cfg.skill} @ ${cfg.priceAvax} AVAX`, "ok");
    };

    ws.onclose = () => {
      hooks.onStatus("offline");
      if (!stopped) setTimeout(connect, 1500);
    };
    ws.onerror = () => {};

    ws.onmessage = async (ev) => {
      let msg: { type?: string; id?: string; payment?: string; body?: Record<string, unknown> };
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.type !== "infer" || !msg.id) return;
      const id = msg.id;
      const reply = (status: number, body: unknown, paymentResponse?: string) =>
        ws?.send(JSON.stringify({ type: "infer-result", id, status, body, paymentResponse }));
      const need = (error: string) => reply(402, { x402Version: 1, accepts: [avaxReq()], error });

      try {
        if (!msg.payment) {
          hooks.onLog("402 · unpaid request", "in");
          return need("payment required");
        }
        let parsed: { scheme?: string; txHash?: `0x${string}` };
        try {
          parsed = JSON.parse(atob(msg.payment));
        } catch {
          return need("bad X-PAYMENT");
        }
        if (parsed.scheme !== "avax-native" || !parsed.txHash) return need("this provider accepts native AVAX only");

        const txHash = parsed.txHash;
        if (consumed.has(txHash.toLowerCase())) return need("payment already used");
        hooks.onLog(`verifying AVAX payment ${txHash.slice(0, 10)}…`, "in");
        const tx = await publicClient.getTransaction({ hash: txHash }).catch(() => null);
        if (!tx || !tx.to || tx.to.toLowerCase() !== cfg.account.toLowerCase()) return need("wrong recipient");
        if (tx.value < BigInt(avaxReq().maxAmountRequired)) return need("underpaid");
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") return need("tx not confirmed");
        consumed.add(txHash.toLowerCase());

        const prompt = typeof msg.body?.prompt === "string" ? (msg.body.prompt as string) : "";
        if (!prompt) return reply(400, { error: "missing prompt" });

        const paymentResponse = btoa(JSON.stringify({ success: true, txHash, network: "avalanche-fuji", payer: tx.from }));

        if (cfg.skill === "trade-signal") {
          const s = await generateSignal(prompt, llm);
          hooks.onLog(`✓ signal · ${s.direction.toUpperCase()} ${s.symbol} · +${cfg.priceAvax} AVAX`, "ok");
          hooks.onServed();
          return reply(200, { result: s.rationale, signal: { ...s, provider: cfg.account }, txHash, paidWith: "avax-native" }, paymentResponse);
        }

        if (cfg.skill === "yield-allocator") {
          const a = await generateAllocation(prompt, llm);
          hooks.onLog(`✓ yield plan · ${a.risk} · ${a.blendedApy}% blended · +${cfg.priceAvax} AVAX`, "ok");
          hooks.onServed();
          return reply(200, { result: a.rationale, allocation: { ...a, provider: cfg.account }, txHash, paidWith: "avax-native" }, paymentResponse);
        }

        if (!cfg.openrouterKey) return reply(503, { error: "provider has no LLM key" });
        const result = await callOpenRouter(cfg.openrouterKey, cfg.model || "openai/gpt-4o-mini", "You are a helpful assistant. Be concise.", prompt);
        hooks.onLog(`✓ inference served · +${cfg.priceAvax} AVAX`, "ok");
        hooks.onServed();
        return reply(200, { result: result ?? "", model: cfg.model || "openai/gpt-4o-mini", txHash, paidWith: "avax-native" }, paymentResponse);
      } catch (e) {
        hooks.onLog(`error: ${(e as Error).message}`, "warn");
        reply(500, { error: (e as Error).message });
      }
    };
  };

  connect();
  return {
    stop: () => {
      stopped = true;
      ws?.close();
      hooks.onStatus("offline");
    },
  };
}
