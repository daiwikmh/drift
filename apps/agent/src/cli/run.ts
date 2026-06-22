// The DRIFT agent runtime: boots the immersive screen, loads/creates the wallet,
// joins the mesh, serves x402-gated compute (if it has skills), and drives a
// readline REPL to discover + buy compute. One process = one agent = one window.
import * as readline from "node:readline";
import * as screen from "./screen.js";
import { c, hex, banner, bootPanel, box } from "./ui.js";
import { config } from "../config.js";
import { theme } from "../theme.js";
import { shortAddr } from "../identity.js";
import { ERC8004 } from "../chain/addresses.js";
import { A2AClient } from "../a2a/client.js";
import type { Peer } from "../a2a/types.js";
import { complete, llmEnabled, llmMeta, setLlm, detectProvider, defaultModel } from "../llm.js";
import { loadOrCreateWallet, loadLlm, saveLlm, loadAgentId, saveAgentId, llmConfigPath, DRIFT_DIR } from "../store.js";
import { avaxBalance, register, getIdentity, getReputation, giveFeedback } from "../chain/registry.js";
import { txUrl, addressUrl, nftUrl } from "../chain/client.js";
import { createInferHandler, type InferRequest, type InferResponse } from "../compute/server.js";
import { buyInference } from "../compute/buy.js";
import { usdcBalance } from "../x402/usdc.js";

export type AgentOpts = { name: string; skills: string[] };

const computePort = (name: string): number =>
  Number(process.env.COMPUTE_PORT) ||
  8100 + ([...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 400);
const computePrice = (): number => Number(process.env.COMPUTE_PRICE_USDC) || 0.01;
const computePriceAvax = (): number => Number(process.env.COMPUTE_PRICE_AVAX) || 0.001;

const question = (rl: readline.Interface, q: string): Promise<string> =>
  new Promise((res) => rl.question(q, res));

// readline that masks typed characters — for pasting an API key.
function askHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const r = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    (r as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      const out = (r as unknown as { output: NodeJS.WriteStream }).output;
      if (s.includes("\n") || s === query) out.write(s);
      else out.write("*");
    };
    r.question(query, (a) => {
      r.close();
      process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

export async function runAgent(opts: AgentOpts): Promise<void> {
  const { name, skills } = opts;
  const fs = screen.fullscreen();

  // Wallet: loaded or created+persisted on first run (its address = identity).
  const { wallet, created } = await loadOrCreateWallet(name);
  const addr = wallet.address;

  // LLM: a key saved via `setup` (~/.drift/llm.json) wins over any env seeding.
  const storedLlm = await loadLlm();
  if (storedLlm) setLlm(storedLlm.provider, storedLlm.apiKey, storedLlm.model);
  const llm = llmMeta();

  // On-chain identity (ERC-8004) + live balance.
  let agentId = await loadAgentId(addr);
  let balance = "…";

  let peers: Peer[] = [];
  let buys = 0;

  const header = () =>
    `${c.dim("sys")}   ${c.grey("avalanche fuji")}  ${c.faint("·")}  ${c.accent("testnet")}  ${c.faint("·")}  ${c.grey(shortAddr(addr))}`;
  const statusLine = () =>
    " " +
    [
      `${c.dim("agent")} ${c.accent(name)}`,
      c.amber("fuji"),
      c.grey(`wallet ${balance} AVAX`),
      agentId !== null ? c.up(`id #${agentId}`) : c.grey("unregistered"),
      c.grey(`buys ${buys}`),
      peers.length ? c.up(`peers ${peers.length}`) : c.grey("peers 0"),
    ].join(`  ${c.faint("·")}  `);

  if (fs) {
    screen.enter();
    screen.setHeader(header());
  } else {
    console.log("\n" + header());
  }

  await banner();
  await bootPanel(
    [
      { label: "runtime", value: "a2a · x402 compute marketplace", ok: true },
      { label: "fuji rpc", value: config.rpcUrl.replace(/^https?:\/\//, ""), ok: true },
      { label: "identity", value: `${shortAddr(addr)}${created ? " · new" : ""}`, ok: true },
      {
        label: "erc-8004",
        value: agentId !== null ? `registered · agent #${agentId}` : "unregistered — type `register`",
        ok: agentId !== null,
      },
      { label: "x402", value: "usdc · facilitator", ok: true },
      { label: "relay", value: config.relayUrl.replace(/^wss?:\/\//, ""), ok: true },
      { label: "agent api", value: llm ? `${llm.provider} · ${llm.model}` : "not set — type `setup`", ok: llmEnabled() },
    ],
    `— type ${c.bold("providers")} to discover, ${c.bold("buy")} to purchase ${c.dim("· or")} ${c.bold("help")}`
  );

  if (fs) {
    screen.setStatus(statusLine());
    screen.toBottom();
  }

  // --- readline + feed (async lines redraw around the prompt) ----------------
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt(c.accent("> "));

  const feed = (line: string) => {
    if (fs) {
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
    }
    process.stdout.write(line + "\n");
    if (fs) rl.prompt(true);
  };
  const emit = (actor: string, color: string, text: string) =>
    feed(`  ${hex(color)(actor.padEnd(6))} ${c.text(text)}`);
  const emitSub = (text: string) => feed(`         ${c.dim("└ " + text)}`);
  const refreshStatus = () => {
    if (fs) screen.setStatus(statusLine());
  };

  const refreshBalance = () =>
    avaxBalance(addr)
      .then((b) => {
        balance = Number(b).toFixed(3);
        refreshStatus();
      })
      .catch(() => {});
  refreshBalance();

  if (created) emit("sys", theme.dim, `new wallet created · ${shortAddr(addr)} · ${DRIFT_DIR}`);
  if (!llmEnabled()) emit("sys", theme.amber, "no LLM key yet — type `setup` to add one (OpenRouter / NVIDIA)");
  if (agentId === null) emit("sys", theme.dim, "not yet on-chain — type `register` to mint your ERC-8004 identity");

  // --- compute provider (sells x402-gated LLM inference over the relay) --------
  // An agent booted with skills is a provider. Inference is PROXIED through the
  // relay (buyers POST ${relay}/infer/<addr>) so the provider needs no public URL.
  const relayHttp = config.relayUrl.replace(/^ws/, "http"); // ws→http, wss→https
  const myPrice = computePrice();
  const myPriceAvax = computePriceAvax();
  let myEndpoint: string | undefined;
  let inferHandler: ((req: InferRequest) => Promise<InferResponse>) | null = null;

  if (skills.length) {
    myEndpoint = `${relayHttp}/infer/${addr}`;
    inferHandler = createInferHandler({
      name,
      address: addr,
      privateKey: wallet.privateKey,
      skill: skills[0],
      priceUsdc: myPrice,
      priceAvax: myPriceAvax,
      resource: myEndpoint,
      onEvent: (line) => emit("x402", theme.accent, line),
    });
    emit("sys", theme.up, `serving compute via relay · ${myEndpoint} · ${myPriceAvax} AVAX or ${myPrice} USDC/call`);
  }

  // --- mesh -------------------------------------------------------------------
  let client: A2AClient;
  const host = config.relayUrl.replace(/^wss?:\/\//, "");
  const selfPeer: Peer = {
    addr,
    name,
    skills,
    endpoint: myEndpoint,
    priceUsdc: myPrice,
    priceAvax: myPriceAvax,
    model: llmMeta()?.model,
    agentId: agentId !== null ? Number(agentId) : undefined,
  };
  client = new A2AClient(config.relayUrl, selfPeer, {
    onOpen: () => emit("sys", theme.dim, `relay connected · ${host}`),
    onClose: () => emit("sys", theme.amber, "relay offline — retrying…"),
    onPeers: (ps) => {
      peers = ps.filter((p) => p.addr !== addr);
      refreshStatus();
      for (const p of peers)
        emit("mkt", theme.accent, `● ${p.name} · ${p.skills.join(", ") || "no skills"} · ${shortAddr(p.addr)}`);
    },
    onPresence: (event, p) => {
      if (p.addr === addr) return;
      peers = event === "join" ? [...peers, p] : peers.filter((x) => x.addr !== p.addr);
      refreshStatus();
      emit(
        "mkt",
        event === "join" ? theme.up : theme.dim,
        `${event === "join" ? "●" : "○"} ${p.name} ${event === "join" ? "online" : "offline"} · ${p.skills.join(", ")}`
      );
    },
    onMessage: (from, payload) =>
      emit("inbox", theme.accent, `from ${shortAddr(from)} · ${JSON.stringify(payload).slice(0, 80)}`),
    onInfer: async (id, payment, body) => {
      if (!inferHandler) return client.inferResult(id, 404, { error: "not a provider" });
      try {
        const out = await inferHandler({ paymentHeader: payment, body: (body ?? {}) as Record<string, unknown> });
        client.inferResult(id, out.status, out.body, out.paymentResponse);
      } catch (e) {
        client.inferResult(id, 500, { error: (e as Error).message });
      }
    },
  });
  client.connect();

  // --- setup: add the agent's LLM key, live + persisted ----------------------
  const setup = async () => {
    rl.pause();
    try {
      emit("drift", theme.accent, "setup — add your agent's LLM key (OpenRouter or NVIDIA)");
      const key = await askHidden(c.accent("  paste key (sk-or-… / nvapi-…): "));
      if (!key) {
        emit("drift", theme.amber, "cancelled — no key entered");
        return;
      }
      const provider = detectProvider(key);
      const tmp = readline.createInterface({ input: process.stdin, output: process.stdout });
      const modelAns = (await question(tmp, c.accent(`  model (${defaultModel(provider)}): `))).trim();
      tmp.close();
      setLlm(provider, key, modelAns || undefined);
      await saveLlm({ provider, apiKey: key, model: modelAns || undefined });
      const m = llmMeta()!;
      selfPeer.model = m.model;
      client.announce(); // re-advertise so buyers see the model I serve
      emit("drift", theme.up, `✓ analyst ready · ${m.provider} · ${m.model}`);
      emitSub(`saved to ${llmConfigPath}`);
    } finally {
      rl.resume();
      rl.prompt();
    }
  };

  // --- on-chain identity (real ERC-8004 registration on Fuji) ----------------
  const doRegister = async () => {
    if (agentId !== null) {
      emit("drift", theme.up, `already registered · agent #${agentId}`);
      return;
    }
    emit("drift", theme.accent, "● identity.register  (ERC-8004 · Avalanche Fuji)");
    emitSub("submitting transaction…");
    const uri = `data:application/json,${encodeURIComponent(
      JSON.stringify({
        name,
        skills,
        address: addr,
        endpoint: myEndpoint,
        priceAvax: myEndpoint ? myPriceAvax : undefined,
        priceUsdc: myEndpoint ? myPrice : undefined,
      })
    )}`;
    try {
      const { agentId: id, txHash } = await register(wallet.privateKey, uri);
      agentId = id;
      await saveAgentId(addr, id);
      selfPeer.agentId = Number(id);
      client.announce(); // re-broadcast presence with the fresh on-chain id
      emit("drift", theme.up, `✓ registered on-chain · agent #${id}`);
      emitSub(txUrl(txHash));
      refreshBalance();
      refreshStatus();
    } catch (e) {
      emit("drift", theme.amber, `register failed: ${(e as Error).message.split("\n")[0]}`);
    }
  };

  // --- command dispatch ------------------------------------------------------
  // Free-form input is answered by this agent's own LLM. To buy compute from
  // another agent, use `providers` + `buy`.
  const askAgent = async (text: string) => {
    if (!llmEnabled()) {
      emit("drift", theme.amber, "no LLM key — type `setup` to add one, or `buy <#> <prompt>` from a provider");
      return;
    }
    const sys =
      `You are ${name}, an agent on the DRIFT compute marketplace on Avalanche. ` +
      `Answer the user briefly. To buy inference from another agent they can type ` +
      `\`providers\` then \`buy <#> <prompt>\`.`;
    emit("drift", theme.dim, "thinking…");
    try {
      const reply = await complete(sys, text);
      emit("drift", theme.accent, reply?.trim() || "no reply from agent");
    } catch (e) {
      emit("drift", theme.amber, `agent error: ${(e as Error).message}`);
    }
  };

  // --- discovery: live providers, enriched + ranked by on-chain reputation ----
  // The relay says who is live; the chain (ERC-8004) is the source of truth for
  // the endpoint to reach them and the reputation that ranks them.
  type Ranked = { peer: Peer; rep: { count: number; avg: number } | null; endpoint: string };
  const rankedProviders = async (): Promise<Ranked[]> => {
    const provs = peers.filter((p) => p.skills.length);
    const enriched = await Promise.all(
      provs.map(async (peer) => {
        let rep: { count: number; avg: number } | null = null;
        if (peer.agentId !== undefined) {
          try {
            rep = await getReputation(BigInt(peer.agentId));
          } catch {
            /* reputation read failed */
          }
        }
        // Always reach providers through the relay proxy (no public URL needed).
        return { peer, rep, endpoint: `${relayHttp}/infer/${peer.addr}` };
      })
    );
    // Highest average score first, then most-reviewed; registered before off-chain.
    enriched.sort(
      (a, b) =>
        (b.rep?.avg ?? -1) - (a.rep?.avg ?? -1) || (b.rep?.count ?? -1) - (a.rep?.count ?? -1)
    );
    return enriched;
  };

  const repLabel = (rep: { count: number; avg: number } | null, hasId: boolean): string =>
    !hasId ? "off-chain" : !rep ? "★ —" : rep.count ? `★${rep.avg.toFixed(0)} (${rep.count})` : "★ new";

  // --- buy compute: pay an x402 endpoint and get the result ------------------
  const doBuy = async (rest: string[]) => {
    const target = rest[0];
    const prompt = rest.slice(1).join(" ");
    if (!target || !prompt) {
      emit("drift", theme.amber, "usage: buy <#|url> <prompt>   (see `providers`)");
      return;
    }
    let endpoint = target;
    let chosen: Peer | undefined;
    if (/^\d+$/.test(target)) {
      const ranked = await rankedProviders();
      const r = ranked[Number(target) - 1];
      if (!r) {
        emit("drift", theme.amber, `no provider #${target} — type \`providers\``);
        return;
      }
      chosen = r.peer;
      endpoint = r.endpoint;
    } else {
      chosen = peers.find((p) => `${relayHttp}/infer/${p.addr}` === target || p.endpoint === target);
    }
    const price = (chosen?.priceAvax as number | undefined) ?? "?";
    emit("drift", theme.accent, `● buying inference · ${price} AVAX → ${endpoint}`);
    emitSub("paying native AVAX on Fuji to unlock the result…");
    try {
      const out = await buyInference(endpoint, prompt, wallet.privateKey, { pay: "avax" });
      if (out.txHash) {
        emit("x402", theme.up, `✓ paid ${price} AVAX · ${out.paidWith ?? "avax-native"} · Avalanche Fuji`);
        emitSub(txUrl(out.txHash));
      }
      emit("drift", theme.accent, out.result || "(empty result)");
      buys++;
      refreshBalance();
      refreshStatus();
      // Close the trust loop: post real ERC-8004 feedback for a registered provider.
      if (chosen?.agentId !== undefined) {
        emitSub("posting reputation feedback on-chain…");
        try {
          const fb = await giveFeedback(wallet.privateKey, BigInt(chosen.agentId), 100, "compute");
          emit("x402", theme.up, `★ feedback posted for agent #${chosen.agentId}`);
          emitSub(txUrl(fb));
        } catch (e) {
          emit("drift", theme.amber, `feedback failed: ${(e as Error).message.split("\n")[0]}`);
        }
      }
    } catch (e) {
      emit("drift", theme.amber, `buy failed: ${(e as Error).message}`);
    }
  };

  const dispatch = async (raw: string) => {
    const line = raw.trim();
    if (!line) return;
    emit("you", theme.accent, line);
    const [cmd, ...rest] = line.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case "help":
        box("commands", [
          `${c.bold("providers")}              compute providers online, ranked by reputation`,
          `${c.bold("buy <#|url> <prompt>")}   pay a provider (AVAX) & get the inference result`,
          `${c.bold("register")}               mint my on-chain ERC-8004 identity`,
          `${c.bold("onchain")}                read my identity back from Avalanche + explorer links`,
          `${c.bold("peers")}                  agents online right now`,
          `${c.bold("skills")}                 what I serve`,
          `${c.bold("setup")}                  add / change my LLM key`,
          `${c.bold("whoami")}                 my name · address · agent id · balances`,
          `${c.bold("clear")} · ${c.bold("quit")}           clear screen · exit`,
          `${c.dim("…or just talk to me")}`,
        ]);
        break;
      case "peers":
      case "agents":
        if (!peers.length) emit("mkt", theme.amber, "no agents online — start another with `drift agent`");
        else
          peers.forEach((p, i) =>
            emit("mkt", theme.accent, `${i + 1}. ${p.name} · ${p.skills.join(", ") || "no skills"} · ${shortAddr(p.addr)}`)
          );
        break;
      case "providers": {
        const ranked = await rankedProviders();
        if (!ranked.length) {
          emit("mkt", theme.amber, "no compute providers online — start one with `drift agent --skills llm-inference`");
          break;
        }
        emit("mkt", theme.dim, "ranked by on-chain ERC-8004 reputation:");
        ranked.forEach((r, i) => {
          const id = r.peer.agentId !== undefined ? `#${r.peer.agentId}` : "unregistered";
          emit(
            "mkt",
            theme.accent,
            `${i + 1}. ${r.peer.name} · ${r.peer.skills[0] || "compute"} · ${repLabel(r.rep, r.peer.agentId !== undefined)} · ${id}`
          );
          emitSub(r.endpoint);
        });
        break;
      }
      case "buy": {
        await doBuy(rest);
        return;
      }
      case "skills":
        emit(
          "drift",
          theme.accent,
          skills.length ? `I serve: ${skills.join(", ")} @ ${myEndpoint}` : "I serve no compute (start with --skills llm-inference)"
        );
        break;
      case "whoami": {
        emit("drift", theme.accent, `${name} · ${addr}${agentId !== null ? ` · agent #${agentId}` : " · unregistered"}`);
        try {
          const usdc = await usdcBalance(addr);
          emitSub(`balance ${balance} AVAX · ${usdc.toFixed(2)} USDC`);
        } catch {
          /* ignore */
        }
        return;
      }
      case "register":
        await doRegister();
        return;
      case "onchain":
      case "identity":
        if (agentId === null) {
          emit("drift", theme.amber, "not registered yet — type `register`");
          break;
        }
        emit("drift", theme.accent, `● reading ERC-8004 identity #${agentId} from Avalanche Fuji…`);
        try {
          const { owner, tokenURI } = await getIdentity(agentId);
          let meta = tokenURI;
          if (tokenURI.startsWith("data:application/json,")) {
            try {
              meta = decodeURIComponent(tokenURI.slice("data:application/json,".length));
            } catch {
              /* keep raw */
            }
          }
          emitSub(`owner    ${owner}`);
          emitSub(`metadata ${meta.slice(0, 160)}`);
          emit("drift", theme.up, "✓ verified on-chain · view it:");
          emitSub(`agent NFT  ${nftUrl(ERC8004.identity, agentId)}`);
          emitSub(`wallet     ${addressUrl(owner)}`);
        } catch (e) {
          emit("drift", theme.amber, `read failed: ${(e as Error).message.split("\n")[0]}`);
        }
        return;
      case "setup":
        await setup();
        return;
      case "clear":
        if (fs) {
          process.stdout.write("\x1b[2J\x1b[H");
          screen.refresh();
          screen.toBottom();
        }
        break;
      case "quit":
      case "exit":
        rl.close();
        return;
      default:
        await askAgent(line);
    }
  };

  rl.on("line", async (raw) => {
    await dispatch(raw);
    rl.prompt();
  });
  rl.on("SIGINT", () => {
    screen.exit();
    process.exit(0);
  });
  rl.on("close", () => {
    screen.exit();
    console.log(c.dim("bye"));
    process.exit(0);
  });
  rl.prompt();
}
