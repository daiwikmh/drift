import { Reveal } from "./primitives";
import { CodeWindow, DataBox, TxnPill } from "./ui";

export default function Enrich() {
  return (
    <section className="relative overflow-hidden bg-white py-28">
      {/* faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-[1180px] px-6">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-center text-[clamp(1.8rem,4.5vw,3.2rem)] font-bold leading-[1.05] tracking-tight text-ink">
            Spade enriches transaction data in real time, adding structure,
            accuracy, and intelligence at every layer.
          </h2>
        </Reveal>

        {/* node layout */}
        <div className="relative mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          <Reveal delay={0} className="md:col-span-1">
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
          </Reveal>

          <Reveal delay={140} className="flex flex-col justify-center gap-4">
            <DataBox label="API KEY" lines={["AIzaSyDaGmRKa42xKZ-HjGw7ISLn"]} />
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
            <div className="flex items-center justify-between rounded-md border border-ink/15 px-3 py-2 font-mono text-[10px] text-ink/70">
              <span>LATENCY</span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-16 rounded-full bg-gradient-to-r from-lime to-ink/20" />
                50MS
              </span>
            </div>
          </Reveal>

          <Reveal delay={280} className="flex flex-col gap-4">
            <DataBox label="MERCHANT" lines={["APPLE", "APPLE, INC."]} />
            <DataBox
              label="LOCATION"
              lines={["2314 8 7866 16, 161825,", "01 757222", "(12.2611, -96.5624)"]}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
