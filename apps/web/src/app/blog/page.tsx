import Link from "next/link";
import Nav from "@/features/landing/components/Nav";
import Footer from "@/features/landing/components/Footer";
import { posts } from "@/features/landing/blogs";

export const metadata = {
  title: "Blog — DRIFT",
  description: "Build log from the DRIFT team: inspiration, architecture, strategies, and ecosystem.",
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />

      <main className="mx-auto max-w-5xl px-6 pb-32 pt-36">
        <div className="mb-14">
          <span className="mb-4 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
            Build log
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            From the lab.
          </h1>
          <p className="mt-4 max-w-lg text-white/45">
            How DRIFT was designed, built, and connected — from the first honest
            backtest to the Mantle ecosystem.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-2xl border border-white/[0.08] transition duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-black/40"
              style={{ background: "linear-gradient(160deg, #0d0e15 0%, #0a0b0f 100%)" }}
            >
              {/* styled header zone */}
              <div className="relative h-44 overflow-hidden border-b border-white/[0.06]">
                {/* accent radial glow */}
                <div
                  className="absolute inset-0 opacity-50 transition duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(ellipse at 20% 70%, ${post.accent}28 0%, transparent 60%)`,
                  }}
                />
                {/* dot grid */}
                <div
                  className="absolute inset-0 opacity-[0.055]"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
                {/* giant watermark */}
                <span
                  className="pointer-events-none absolute -bottom-5 -right-2 select-none font-mono font-black uppercase leading-none tracking-tighter opacity-[0.09] transition duration-500 group-hover:opacity-[0.16]"
                  style={{ fontSize: "108px", color: post.accent }}
                >
                  {post.tag}
                </span>
                {/* post index */}
                <span className="absolute right-5 top-5 font-mono text-[11px] text-white/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* tag pill */}
                <span
                  className="absolute bottom-5 left-5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
                  style={{
                    color: post.accent,
                    backgroundColor: `${post.accent}18`,
                    border: `1px solid ${post.accent}38`,
                  }}
                >
                  {post.tag}
                </span>
                {/* accent gradient line at top */}
                <div
                  className="absolute inset-x-0 top-0 h-[1.5px] opacity-70 transition duration-300 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, ${post.accent} 0%, ${post.accent}20 100%)`,
                  }}
                />
              </div>

              {/* body */}
              <div className="p-6">
                <h2 className="mb-2 text-[15px] font-semibold leading-snug text-white transition group-hover:text-white/90">
                  {post.title}
                </h2>
                <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-white/40">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-white/25">
                    {post.date} · {post.readTime} read
                  </span>
                  <span className="font-mono text-[11px] text-white/25 opacity-0 transition group-hover:opacity-100">
                    Read →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
