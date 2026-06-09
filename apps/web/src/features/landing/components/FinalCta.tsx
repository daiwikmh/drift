import { Reveal } from "./primitives";
import { EngravedSphere, EngravedDisc } from "./art";

export default function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ink py-32">
      <div className="pointer-events-none absolute left-6 top-10 opacity-90">
        <EngravedDisc size={220} stroke="var(--lime)" />
      </div>
      <div className="pointer-events-none absolute bottom-8 right-10 opacity-90">
        <EngravedSphere size={240} stroke="var(--lime)" />
      </div>

      <Reveal className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-[clamp(2.4rem,6vw,4.4rem)] font-bold leading-[1.0] tracking-tight text-white">
          Add intelligence to{" "}
          <span className="text-lime">every layer</span> of your data
        </h2>
        <div className="mt-8 flex justify-center">
          <a
            href="#"
            className="rounded-md bg-lime px-7 py-3.5 font-mono text-sm font-medium text-ink transition hover:brightness-95"
          >
            Contact sales
          </a>
        </div>
      </Reveal>
    </section>
  );
}
