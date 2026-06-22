#!/usr/bin/env node
import { Command } from "commander";
import { runAgent } from "./cli/run.js";
import { startRelay } from "./relay/server.js";

const program = new Command();

program
  .name("drift")
  .description("DRIFT — an agent that sells & buys compute on Avalanche (x402 + ERC-8004)");

program
  .command("relay")
  .description("run the rendezvous relay (WebSocket mesh + HTTP /providers + /infer proxy)")
  .option("-p, --port <port>", "port to listen on (defaults to $PORT or 8787)")
  .action((opts: { port?: string }) => {
    const port = Number(opts.port || process.env.PORT || 8787);
    startRelay(port);
    console.log(`drift relay listening on :${port} (ws + http)`);
  });

program
  .command("agent", { isDefault: true })
  .description("boot this agent: register, join the mesh, serve/buy compute")
  .option("-n, --name <name>", "agent name", "drift")
  .option("-s, --skills <list>", "comma-separated skills this agent serves (e.g. llm-inference)", "")
  .action((opts: { name: string; skills: string }) => {
    const skills = opts.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    void runAgent({ name: opts.name, skills });
  });

program.parseAsync(process.argv);
