"use client";

import { EngravedSphere } from "./art";
import { DataBox, TxnPill, Button } from "./ui";
import { useParallax } from "./primitives";

export default function Hero() {
  const art = useParallax(0.12);
  const card = useParallax(0.05);

  return (
    <section className="relative overflow-hidden bg-sage pt-28 pb-24">
      {/* ruler edges */}
      <div className="ruler-edge absolute inset-y-0 left-0 w-4 opacity-70" />
      <div className="ruler-edge absolute inset-y-0 right-0 w-4 opacity-70" />

      <div className="relative mx-auto max-w-[1180px] px-6">
        <h1 className="mx-auto max-w-4xl text-center text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-[0.98] tracking-tight text-ink">
          The data &amp; AI platform
          <br />
          for modern finance
        </h1>

        <div className="relative mt-10 h-[360px] sm:h-[420px]">
          <div
            ref={art}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <EngravedSphere size={380} />
          </div>

          {/* floating data boxes (left) */}
          <DataBox
            className="absolute left-0 top-16 w-60"
            label="TRANSACTION ID"
            lines={["38012128618"]}
          />
          <DataBox
            className="absolute left-2 top-40 w-64"
            label="LOCATION"
            lines={[
              "1164 BROADWAY,",
              "NEW YORK, NY 10001,",
              "UNITED STATES",
              "(32.6416, -96.8396)",
            ]}
          />

          {/* floating txn pill (right) */}
          <div
            ref={card}
            className="absolute right-0 top-24 sm:right-6"
          >
            <TxnPill
              logo={
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#036635] text-white">
                  ✸
                </span>
              }
              name="Starbucks"
              time="2025-09-27 09:23:16"
              amount="-$14.00"
            />
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-ink/70">
          Spade takes messy transaction data and turns it into structured,
          verified records — with AI agents that help you use it everywhere it
          matters.
        </p>

        <div className="mt-8 flex justify-center">
          <Button variant="dark">Contact sales</Button>
        </div>
      </div>
    </section>
  );
}
