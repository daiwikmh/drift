function PillIcon({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <span className="grid h-5 w-5 place-items-center" style={{ color: tint }} aria-hidden>
      {children}
    </span>
  );
}

const pills = [
  {
    label: "MACD",
    tint: "#22d3ee",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M3 3v18h18M7 14l3-4 3 3 4-6" />
      </svg>
    ),
  },
  {
    label: "RSI",
    tint: "#f59e0b",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M3 12h4l2 6 4-14 2 8h6" />
      </svg>
    ),
  },
  {
    label: "Bollinger",
    tint: "#10b981",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M5 4v16M19 4v16M9 8c2 2 4 6 6 8" />
      </svg>
    ),
  },
  {
    label: "Dual Thrust",
    tint: "#8b5cf6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
];

function Pill({ p }: { p: (typeof pills)[number] }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 align-middle shadow-sm">
      <PillIcon tint={p.tint}>{p.icon}</PillIcon>
      <span className="text-[#101010]">{p.label}</span>
    </span>
  );
}

export function DeployAgents() {
  return (
    <section className="relative overflow-hidden">
      {/* full-bleed background */}
      <div
        className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-cover px-6 py-24"
        style={{ backgroundImage: "url(/blog-engineering.jpg)", backgroundPosition: "center 50%" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
        <h2 className="relative max-w-4xl text-center text-3xl font-semibold leading-[1.5] tracking-tight text-white sm:text-[40px] sm:leading-[1.45]">
          Run <Pill p={pills[0]} /> <Pill p={pills[1]} /> <Pill p={pills[2]} /> and <Pill p={pills[3]} /> on Bybit — with risk you can see, and a stop you can&apos;t override.
        </h2>
      </div>
    </section>
  );
}
