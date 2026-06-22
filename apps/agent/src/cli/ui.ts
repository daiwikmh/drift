// Terminal styling for the DRIFT agent — truecolor over the periwinkle palette
// (theme.ts), plus the boot banner, preflight panel, and box helpers. Raw ANSI,
// no Ink, so it composes with readline.
import { theme } from "../theme.js";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const ANSI = /\x1b\[[0-9;]*m/g;

export function hex(h: string): (s: string) => string {
  if (!useColor) return (s) => s;
  const v = h.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return (s) => `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;
}

export const c = {
  accent: hex(theme.accent),
  up: hex(theme.up),
  down: hex(theme.down),
  amber: hex(theme.amber),
  grey: hex(theme.grey),
  dim: hex(theme.dim),
  faint: hex(theme.faint),
  text: hex(theme.text),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
};

const vlen = (s: string) => s.replace(ANSI, "").length;
const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - vlen(s)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ART = [
  "██████╗ ██████╗ ██╗███████╗████████╗",
  "██╔══██╗██╔══██╗██║██╔════╝╚══██╔══╝",
  "██║  ██║██████╔╝██║█████╗     ██║",
  "██║  ██║██╔══██╗██║██╔══╝     ██║",
  "██████╔╝██║  ██║██║██║        ██║",
  "╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝",
];

export async function banner(): Promise<void> {
  console.log("");
  for (const l of ART) {
    console.log("   " + c.accent(l));
    if (useColor) await sleep(35);
  }
  console.log(
    "   " +
      c.dim("compute marketplace") +
      "  " +
      c.faint("·") +
      "  " +
      c.grey("sell") +
      " " +
      c.faint("×") +
      " " +
      c.grey("buy compute") +
      "  " +
      c.faint("·") +
      "  " +
      c.accent("avalanche fuji")
  );
  console.log("");
}

export type Pre = { label: string; value: string; ok?: boolean };

export async function bootPanel(rows: Pre[], readyHint: string): Promise<void> {
  console.log(c.dim("> drift init"));
  const width = 30;
  for (let i = 0; i <= width; i += 2) {
    const bar = c.accent("█".repeat(i)) + c.faint("·".repeat(width - i));
    process.stdout.write(`  ${bar}  ${c.dim(String(Math.round((i / width) * 100)).padStart(3) + "%")}\r`);
    if (useColor) await sleep(18);
  }
  process.stdout.write("\n");
  const w = Math.max(...rows.map((r) => r.label.length));
  for (const r of rows) {
    const mark = r.ok === false ? c.amber("✗") : c.up("✓");
    console.log(`  ${c.accent("◇")} ${c.grey(pad(r.label, w))}  ${c.faint("│")}  ${c.dim(r.value)}  ${mark}`);
    if (useColor) await sleep(80);
  }
  console.log(`  ${c.up("✓ ready")}  ${c.dim(readyHint)}\n`);
}

export function box(title: string, lines: string[]): void {
  const inner = Math.max(vlen(title) + 2, ...lines.map(vlen), 44);
  console.log(c.faint(`╭─ `) + c.bold(title) + c.faint(` ${"─".repeat(Math.max(0, inner - vlen(title) - 1))}╮`));
  for (const l of lines) console.log(c.faint("│ ") + pad(l, inner) + c.faint(" │"));
  console.log(c.faint(`╰${"─".repeat(inner + 2)}╯`));
}
