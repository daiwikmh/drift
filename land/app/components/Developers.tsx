import { Reveal } from "./primitives";
import { CodeWindow } from "./ui";
import { EngravedSphere } from "./art";

export default function Developers() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 md:grid-cols-2">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
            [Developers]
          </div>
          <h2 className="mt-5 max-w-md text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-[1.05] tracking-tight text-ink">
            Integrate Spade&apos;s API in minutes. No complex setup, no custom
            configuration — just high-performance enrichment that scales
            automatically.
          </h2>
          <div className="mt-7">
            <a href="#" className="font-mono text-sm text-ink hover:underline">
              ▸ Explore our docs
            </a>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="relative">
            <div className="relative mb-[-40px] ml-[-10px] w-44 rounded-xl border border-ink/15 bg-white p-4">
              <div className="font-mono text-[9px] tracking-wider text-ink/50">
                ▪ TRANSACTION ID-9367
              </div>
              <EngravedSphere size={130} className="mx-auto" lines={26} />
              <p className="font-mono text-[7px] leading-relaxed text-ink/50">
                SPADE IS SOC 2 TYPE II COMPLIANT AND DESIGNED FOR ENTERPRISE-GRADE
                PRIVACY — WITH NO PII EVER PROCESSED.
              </p>
            </div>
            <CodeWindow dark className="ml-auto w-full max-w-sm">
              <pre className="whitespace-pre-wrap">{`{
  "id": "TST STORE MGRSBUX7",
  "amount": "18.82",
  "userId": "csv_11.gz",
  "location": { "country": "USA" },
  "acquirerId": "4445062483714",
  "occurredAt": "2025-09-27 09:23:16",
  "categoryCode": "5812",
  "currencyCode": "USD",
  "transactionId": "38012128618"
}`}</pre>
            </CodeWindow>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
