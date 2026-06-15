"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useScrollReveal";
import { posts } from "../blogs";

function Heading() {
  return (
    <div className="mx-auto max-w-2xl px-6 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        From the build log.
      </h2>
      <p className="mt-4 text-white/45">
        Inspiration, architecture, strategies, and the ecosystem — everything
        that went into building DRIFT, written down.
      </p>
    </div>
  );
}

function BlogCard({ post, index }: { post: (typeof posts)[number]; index: number }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block w-[300px] shrink-0 sm:w-[360px]"
    >
      {/* styled header */}
      <div
        className="relative h-44 overflow-hidden rounded-2xl border border-white/[0.08] transition duration-300 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-2xl group-hover:shadow-black/50"
        style={{ background: "linear-gradient(135deg, #0d0e15 0%, #0a0b0f 100%)" }}
      >
        {/* accent radial glow */}
        <div
          className="absolute inset-0 opacity-50 transition duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse at 25% 65%, ${post.accent}28 0%, transparent 60%)`,
          }}
        />
        {/* dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        {/* giant watermark tag */}
        <span
          className="pointer-events-none absolute -bottom-4 -right-2 select-none font-mono font-black uppercase leading-none tracking-tighter opacity-[0.09] transition duration-500 group-hover:opacity-[0.16]"
          style={{ fontSize: "96px", color: post.accent }}
        >
          {post.tag}
        </span>
        {/* post index */}
        <span className="absolute right-4 top-4 font-mono text-[11px] text-white/20">
          {String(index + 1).padStart(2, "0")}
        </span>
        {/* tag pill */}
        <span
          className="absolute bottom-4 left-4 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
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

      {/* text body */}
      <div className="mt-4">
        <h3 className="text-base font-semibold leading-snug text-white transition group-hover:text-[#cbd3ff]">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/40">
          {post.excerpt}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[11px] text-white/25">
            {post.date} · {post.readTime} read
          </span>
          <span className="font-mono text-[11px] text-white/25 opacity-0 transition group-hover:opacity-100">
            Read →
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeatureCarousel() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !sectionRef.current || !trackRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const track = trackRef.current;

    const ctx = gsap.context(() => {
      const distance = () => track.scrollWidth - window.innerWidth + 48;
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reduced]);

  if (reduced) {
    return (
      <section id="strategies" className="py-24">
        <Heading />
        <div className="mt-12 overflow-x-auto px-6">
          <div className="mx-auto flex max-w-[1180px] gap-6">
            {posts.map((p, i) => (
              <BlogCard key={p.slug} post={p} index={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="strategies"
      ref={sectionRef}
      className="relative flex h-screen flex-col justify-center overflow-hidden"
    >
      <Heading />
      <div
        ref={trackRef}
        className="mt-14 flex gap-6 will-change-transform"
        style={{
          paddingLeft: "max(1.5rem, calc((100vw - 1180px) / 2))",
          paddingRight: "1.5rem",
        }}
      >
        {posts.map((p, i) => (
          <BlogCard key={p.slug} post={p} index={i} />
        ))}
      </div>
    </section>
  );
}
