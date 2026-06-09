const cols = [
  {
    title: "Use Cases",
    links: ["Risk & Authorization", "Rewards & Attribution", "Analytics & AI", "User Experience"],
  },
  {
    title: "Industries",
    links: ["Fintechs", "Banks", "AI", "Ecosystem Partners"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Security", "Resources"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink pb-10 pt-4 text-white">
      <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[repeat(3,auto)_1fr]">
        {cols.map((c) => (
          <div key={c.title}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              {c.title}
            </div>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:text-lime">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="md:justify-self-end">
          <div className="text-sm text-white/80">Sign up to our newsletter</div>
          <form className="mt-4 flex max-w-xs items-center border border-white/20">
            <input
              type="email"
              placeholder="Email address"
              className="w-full bg-transparent px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="submit"
              className="border-l border-white/20 px-4 py-2.5 text-white hover:bg-white/10"
              aria-label="Subscribe"
            >
              ↵
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto mt-20 flex max-w-[1180px] flex-wrap items-center justify-end gap-5 px-6 font-mono text-[11px] text-white/40">
        <a href="#" className="hover:text-white">Terms of Service</a>
        <a href="#" className="hover:text-white">Privacy Policy</a>
        <a href="#" className="hover:text-white">MSA</a>
        <a href="#" className="hover:text-white">SLA</a>
        <span>© Spade 2026</span>
      </div>
    </footer>
  );
}
