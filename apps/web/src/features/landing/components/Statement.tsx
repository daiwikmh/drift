"use client";

import { useRef } from "react";
import { useScrollProgress } from "./primitives";
import { CodeWindow, DataBox, TxnPill } from "./ui";

/* Floating enriched-transaction cards that swarm in around the first headline. */
const floaters = [
  { icon: "▦", title: "STORE HY248249242", sub: "Food & Drink", amt: "-$1.82", x: "60%", y: "20%", d: 0.02 },
  { icon: "▦", title: "GAS STATION MG283235382", sub: "Gas", amt: "-$98.50", x: "16%", y: "60%", d: 0.06 },
  { icon: "▦", title: "STORE JU24829429", sub: "Shopping", amt: "-$67.00", x: "58%", y: "74%", d: 0.1 },
  { label: "CATEGORY", lines: ["MCC: 5814", "GAS STATION"], x: "16%", y: "34%", d: 0.04 },
  { label: "LOCATION", lines: ["DALLAS, TX USB"], x: "40%", y: "14%", d: 0.08 },
  { label: "LOCATION", lines: ["NEW YORK, NY"], x: "74%", y: "40%", d: 0.05 },
  { label: "MERCHANT", lines: ["STORE HR4274288"], x: "44%", y: "82%", d: 0.12 },
] as const;

const smooth = (p: number, a: number, b: number) => {
  const t = Math.min(Math.max((p - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const p = useScrollProgress(ref);

  // phase timing across the pinned scroll
  const swarmIn = smooth(p, 0.03, 0.22); // floaters + headline 1 settle
  const morph = smooth(p, 0.34, 0.58); // bg dark -> white, grid appears
  const fadeOut = smooth(p, 0.3, 0.46); // headline 1 + floaters leave
  const enrichIn = smooth(p, 0.52, 0.78); // headline 2 + nodes build

  // dark #16230d -> white
  const bg = `rgb(${lerp(22, 255, morph)}, ${lerp(35, 255, morph)}, ${lerp(13, 255, morph)})`;
  const inset = lerp(2, 0, morph); // card expands to full-bleed as it whitens
  const radius = lerp(28, 0, morph);

  return (
    <div ref={ref} style={{ height: "420vh" }} className="relative bg-white">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
          style={{
            background: bg,
            margin: `${inset}vh ${inset}vw`,
            borderRadius: `${radius}px`,
          }}
        >
          {/* faint grid that fades in with the white phase */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: morph * 0.6,
              backgroundImage:
                "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
              backgroundSize: "84px 84px",
            }}
          />

          {/* ---------- PHASE A: statement + swarming cards ---------- */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: 1 - fadeOut, pointerEvents: fadeOut > 0.5 ? "none" : "auto" }}
          >
            {floaters.map((f, i) => {
              const o = smooth(p, f.d, f.d + 0.12) * swarmIn;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: f.x,
                    top: f.y,
                    opacity: o,
                    transform: `translate(-50%,-50%) translateY(${(1 - o) * 24}px) scale(${0.92 + o * 0.08})`,
                  }}
                >
                  {"label" in f ? (
                    <div className="border border-lime/25 bg-lime/5 px-3 py-2 font-mono text-[9px] leading-relaxed text-lime/70">
                      <div className="tracking-wider">▪ {f.label}</div>
                      {f.lines.map((l) => (
                        <div key={l} className="tracking-wider">
                          {l}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-md border border-lime/25 bg-[#0e1a07] px-3 py-2 font-mono text-[10px] text-lime/90">
                      <span className="flex h-5 w-7 items-center justify-center rounded-sm bg-yellow text-ink">
                        {f.icon}
                      </span>
                      <span className="leading-tight">
                        <span className="block max-w-[150px] truncate text-white/90">
                          {f.title}
                        </span>
                        <span className="text-lime/60">{f.sub}</span>
                      </span>
                      <span className="font-bold">{f.amt}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <h2 className="relative z-10 max-w-3xl px-6 text-center text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.05] tracking-tight text-white">
              Financial institutions process billions of transactions every day,{" "}
              <span className="text-lime">but most of that data is hard to use.</span>
            </h2>
          </div>

          {/* ---------- PHASE C: enrichment graph ---------- */}
          <div
            className="absolute inset-0 flex items-center justify-center px-6"
            style={{ opacity: enrichIn, pointerEvents: enrichIn > 0.5 ? "auto" : "none" }}
          >
            <div className="relative mx-auto w-full max-w-[1180px]">
              <h2 className="mx-auto max-w-3xl text-center text-[clamp(1.6rem,3.8vw,2.9rem)] font-bold leading-[1.06] tracking-tight text-ink">
                Spade enriches transaction data in real time, adding structure,
                accuracy, and intelligence at every layer.
              </h2>

              <div className="pointer-events-none mt-10 grid grid-cols-12 gap-4">
                {/* cURL window — top left */}
                <div
                  className="col-span-12 md:col-span-5"
                  style={{ opacity: smooth(p, 0.54, 0.7), transform: `translateY(${(1 - smooth(p, 0.54, 0.7)) * 20}px)` }}
                >
                  <CodeWindow>
                    <pre className="whitespace-pre-wrap">{`{
  "id": "TST STORE",
  "amount": "18.82",
  "userId": "csv_11.gz",
  "location": { "country": "USA" },
  "acquirerId": "4445062483714",
  "categoryCode": "5812",
  "currencyCode": "USD",
  "transactionId": "38012128618"
}`}</pre>
                  </CodeWindow>
                  <div
                    className="mt-4"
                    style={{ opacity: smooth(p, 0.62, 0.76) }}
                  >
                    <DataBox label="API KEY" lines={["AIzaSyDaGmRKa42xKZ-HjGw7ISLn"]} />
                  </div>
                </div>

                {/* center column — txn card + latency */}
                <div
                  className="col-span-12 flex flex-col justify-end gap-3 md:col-span-4"
                  style={{ opacity: smooth(p, 0.6, 0.76), transform: `translateY(${(1 - smooth(p, 0.6, 0.76)) * 24}px)` }}
                >
                  <TxnPill
                    logo={
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-lime">
                        ◧
                      </span>
                    }
                    name="Apple Store Tribeca"
                    time="2025-09-27 00:23:16"
                    amount="-$78.36"
                  />
                  <div className="flex items-center justify-between rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-[10px] text-ink/70">
                    <span>LATENCY</span>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-16 rounded-full bg-gradient-to-r from-lime to-ink/20" />
                      50MS
                    </span>
                  </div>
                </div>

                {/* right column — merchant + location */}
                <div
                  className="col-span-12 flex flex-col gap-3 md:col-span-3"
                  style={{ opacity: smooth(p, 0.64, 0.8), transform: `translateY(${(1 - smooth(p, 0.64, 0.8)) * 20}px)` }}
                >
                  <DataBox label="MERCHANT" lines={["APPLE", "APPLE, INC."]} />
                  <DataBox
                    label="LOCATION"
                    lines={["2314 8 7866 16, 161825,", "01 757222", "(12.2611, -96.5624)"]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
