// The DRIFT agent terminal. One process = one agent = one window (like the anima
// reference). The boot sequence and palette are ported from the Python CLI; the
// live region renders the agent's feed (market.* / agent.message tool-calls) and a
// pinned status bar. Checkpoint 1: boot + status bar + "listening on inbox".
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Static, Text } from "ink";
import { theme } from "../theme.js";
import { config, llmEnabled } from "../config.js";
import { agentAddress, shortAddr, llmMeta } from "../identity.js";
import { ERC8004 } from "../chain/addresses.js";
import { A2AClient } from "../a2a/client.js";
import type { Peer } from "../a2a/types.js";
import { JobEngine } from "../jobs/engine.js";
import { isJobMsg } from "../jobs/protocol.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DRIFT_ART = [
  "██████╗ ██████╗ ██╗███████╗████████╗",
  "██╔══██╗██╔══██╗██║██╔════╝╚══██╔══╝",
  "██║  ██║██████╔╝██║█████╗     ██║",
  "██║  ██║██╔══██╗██║██╔══╝     ██║",
  "██████╔╝██║  ██║██║██║        ██║",
  "╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝",
];

type Item = { id: number; node: React.ReactNode };

type Props = { name: string; skills: string[]; hire?: string; brief?: string };

function ProgressBar({ pct }: { pct: number }) {
  const width = 30;
  const fill = Math.round((pct / 100) * width);
  return (
    <Text>
      {"  "}
      <Text color={theme.accent}>{"█".repeat(fill)}</Text>
      <Text color={theme.faint}>{"·".repeat(width - fill)}</Text>
      {"  "}
      <Text color={theme.dim}>{`${String(pct).padStart(3)}%`}</Text>
    </Text>
  );
}

// An anima-style feed row: a colored actor label + content.
function Line({ actor, color, text }: { actor: string; color: string; text: string }) {
  return (
    <Text>
      {"  "}
      <Text color={color}>{actor.padEnd(6)}</Text> <Text color={theme.text}>{text}</Text>
    </Text>
  );
}

// An indented "└ …" continuation row under a tool-call.
function Sub({ text }: { text: string }) {
  return (
    <Text>
      {"         "}
      <Text color={theme.dim}>└ {text}</Text>
    </Text>
  );
}

function Step({ label, detail, ok }: { label: string; detail: string; ok: boolean }) {
  return (
    <Text>
      {"  "}
      <Text color={theme.accent}>◇</Text> <Text color={theme.grey}>{label.padEnd(13)}</Text>
      <Text color={theme.faint}>│</Text> {"  "}
      <Text color={theme.dim}>{detail}</Text> {"  "}
      <Text color={ok ? theme.up : theme.amber}>{ok ? "✓" : "✗"}</Text>
    </Text>
  );
}

export default function App({ name, skills, hire, brief }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [peers, setPeers] = useState<number>(0);

  const addr = agentAddress();
  const llm = llmMeta();

  const idRef = useRef(0);
  const push = useCallback(
    (node: React.ReactNode) =>
      setItems((x) => [...x, { id: idRef.current++, node }]),
    []
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      push(
        <Text key="art">
          {"\n"}
          {DRIFT_ART.map((l, i) => (
            <Text key={i} color={theme.accent}>
              {"   " + l + "\n"}
            </Text>
          ))}
          <Text>
            {"   "}
            <Text color={theme.dim}>autonomous agent</Text>{" "}
            <Text color={theme.faint}>·</Text> <Text color={theme.grey}>hires</Text>{" "}
            <Text color={theme.faint}>×</Text> <Text color={theme.grey}>gets hired</Text>{" "}
            <Text color={theme.faint}>·</Text> <Text color={theme.accent}>avalanche fuji</Text>
            {"\n"}
          </Text>
        </Text>
      );
      await sleep(180);
      if (!alive) return;

      push(
        <Text>
          <Text color={theme.dim}>{"> drift init"}</Text>
        </Text>
      );
      for (let p = 0; p <= 100 && alive; p += 8) {
        setProgress(Math.min(100, p));
        await sleep(25);
      }
      if (!alive) return;
      setProgress(100);
      await sleep(120);
      push(<ProgressBar pct={100} />);
      setProgress(null);

      const steps: Array<[string, string, boolean]> = [
        ["runtime", "a2a · marketplace · agent loop", true],
        ["fuji rpc", config.rpcUrl.replace(/^https?:\/\//, ""), true],
        [
          "identity",
          addr ? shortAddr(addr) : "missing — set AGENT_PRIVATE_KEY",
          Boolean(addr),
        ],
        ["erc-8004", `identity ${shortAddr(ERC8004.identity)}`, true],
        ["x402", "usdc · facilitator", true],
        ["relay", config.relayUrl.replace(/^wss?:\/\//, ""), true],
        [
          "agent api",
          llm ? `${llm.provider} · ${llm.model}` : "missing — no LLM key",
          llmEnabled(),
        ],
      ];
      for (const [label, detail, ok] of steps) {
        if (!alive) return;
        push(<Step label={label} detail={detail} ok={ok} />);
        await sleep(120);
      }
      await sleep(150);
      if (!alive) return;
      push(
        <Text>
          {"  "}
          <Text color={theme.up}>✓ ready</Text>{" "}
          <Text color={theme.dim}>— skills:</Text>{" "}
          <Text color={theme.accent}>{skills.join(", ") || "none"}</Text>
          {"\n"}
        </Text>
      );
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Once booted, dial out to the rendezvous relay, surface live presence, and run
  // the job engine (worker auto-responds; client initiates a hire when asked).
  const peersRef = useRef<Peer[]>([]);
  const hireDoneRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!addr) {
      push(
        <Line actor="sys" color={theme.amber} text="no wallet — set AGENT_PRIVATE_KEY to join the mesh" />
      );
      return;
    }
    const self: Peer = { addr, name, skills };
    const host = config.relayUrl.replace(/^wss?:\/\//, "");
    const emit = (actor: string, color: string, text: string) =>
      push(<Line actor={actor} color={color} text={text} />);
    const emitSub = (text: string) => push(<Sub text={text} />);

    let client: A2AClient;
    const engine = new JobEngine(
      self,
      (to, payload) => client.send(to, payload),
      emit,
      emitSub,
      () => peersRef.current
    );

    const maybeHire = () => {
      if (!hire || hireDoneRef.current) return;
      if (peersRef.current.some((p) => p.skills.includes(hire))) {
        hireDoneRef.current = true;
        engine.hire(hire, brief || `do a ${hire} job`);
      }
    };

    client = new A2AClient(config.relayUrl, self, {
      onOpen: () => emit("sys", theme.dim, `relay connected · ${host}`),
      onClose: () => emit("sys", theme.amber, "relay offline — retrying…"),
      onPeers: (ps) => {
        const others = ps.filter((p) => p.addr !== addr);
        peersRef.current = others;
        setPeers(others.length);
        for (const p of others)
          emit("mkt", theme.accent, `● ${p.name} · ${p.skills.join(", ") || "no skills"} · ${shortAddr(p.addr)}`);
        maybeHire();
      },
      onPresence: (event, p) => {
        if (p.addr === addr) return;
        if (event === "join") peersRef.current = [...peersRef.current, p];
        else peersRef.current = peersRef.current.filter((x) => x.addr !== p.addr);
        setPeers(peersRef.current.length);
        emit(
          "mkt",
          event === "join" ? theme.up : theme.dim,
          `${event === "join" ? "●" : "○"} ${p.name} ${event === "join" ? "online" : "offline"} · ${p.skills.join(", ")}`
        );
        maybeHire();
      },
      onMessage: (from, payload) => {
        if (isJobMsg(payload)) engine.handle(from, payload);
        else emit("inbox", theme.accent, `from ${shortAddr(from)} · ${JSON.stringify(payload).slice(0, 80)}`);
      },
    });
    client.connect();
    return () => client.close();
  }, [ready, addr, name, push, hire, brief]);

  return (
    <Box flexDirection="column">
      <Static items={items}>{(item) => <Box key={item.id}>{item.node}</Box>}</Static>

      {/* live region: animated progress during boot, then the inbox prompt */}
      {progress !== null && <ProgressBar pct={progress} />}
      {ready && (
        <Box marginTop={1}>
          <Text color={theme.dim}>
            <Text color={theme.accent}>{"> "}</Text>
            listening on inbox…
          </Text>
        </Box>
      )}

      <StatusBar name={name} addr={addr} skills={skills} peers={peers} />
    </Box>
  );
}

function StatusBar({
  name,
  addr,
  skills,
  peers,
}: {
  name: string;
  addr: string | null;
  skills: string[];
  peers: number;
}) {
  const sep = <Text color={theme.faint}> · </Text>;
  return (
    <Box marginTop={1}>
      <Text>
        {"  "}
        <Text color={theme.dim}>agent</Text> <Text color={theme.accent}>{name}</Text>
        {addr && (
          <>
            {" "}
            <Text color={theme.faint}>{shortAddr(addr)}</Text>
          </>
        )}
        {sep}
        <Text color={theme.amber}>fuji</Text>
        {sep}
        <Text color={theme.grey}>wallet — USDC</Text>
        {sep}
        <Text color={theme.grey}>rep —</Text>
        {sep}
        <Text color={theme.grey}>jobs 0</Text>
        {sep}
        <Text color={peers > 0 ? theme.up : theme.grey}>peers {peers}</Text>
        {skills.length > 0 && (
          <>
            {sep}
            <Text color={theme.dim}>{skills.join(",")}</Text>
          </>
        )}
      </Text>
    </Box>
  );
}
