export interface NavLink {
  label: string;
  href: string;
}

export const site = {
  name: "DRIFT",
  tagline: "Deterministic, risk-bounded trading for AI quant strategies.",
  contact: "daiwikmahesh@gmail.com",
  x: "https://x.com",
  nav: [
    { label: "DRIFT", href: "/" },
    { label: "Blog", href: "/blog" },
  ] as NavLink[],
} as const;
