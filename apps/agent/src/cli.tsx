#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { Command } from "commander";
import App from "./ui/App.js";
import { startRelay } from "./relay/server.js";

const program = new Command();

program
  .name("drift")
  .description("DRIFT — an autonomous agent that hires and gets hired on Avalanche");

program
  .command("relay")
  .description("run the WebSocket rendezvous relay agents connect to")
  .option("-p, --port <port>", "port to listen on", "8787")
  .action((opts: { port: string }) => {
    const port = Number(opts.port);
    startRelay(port);
    console.log(`relay listening on ws://0.0.0.0:${port}`);
  });

program
  .command("agent", { isDefault: true })
  .description("boot this agent: register, listen on inbox, take/give jobs")
  .option("-n, --name <name>", "agent name", "drift")
  .option("-s, --skills <list>", "comma-separated skills this agent offers", "")
  .option("-H, --hire <skill>", "on boot, autonomously hire an agent with this skill")
  .option("-b, --brief <text>", "the job brief to send when hiring")
  .action((opts: { name: string; skills: string; hire?: string; brief?: string }) => {
    const skills = opts.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    render(<App name={opts.name} skills={skills} hire={opts.hire} brief={opts.brief} />);
  });

program.parseAsync(process.argv);
