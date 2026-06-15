import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/features/landing/components/Nav";
import Footer from "@/features/landing/components/Footer";
import { posts, getPost, type ContentBlock } from "@/features/landing/blogs";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: `${post.title} — DRIFT`, description: post.excerpt };
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mb-4 mt-12 text-2xl font-bold tracking-tight text-white">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mb-3 mt-8 text-lg font-semibold text-white/90">
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p className="mb-5 leading-[1.85] text-white/60">{block.text}</p>
      );
    case "blockquote":
      return (
        <blockquote className="my-8 border-l-2 border-white/20 pl-5 text-base italic leading-relaxed text-white/50">
          {block.text}
        </blockquote>
      );
    case "code":
      return (
        <pre className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-5 font-mono text-[13px] leading-relaxed text-[#9aa8f0]">
          {block.text}
        </pre>
      );
    case "ul":
      return (
        <ul className="mb-6 space-y-2.5 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-white/55">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
              {item}
            </li>
          ))}
        </ul>
      );
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />

      <main className="mx-auto max-w-2xl px-6 pb-32 pt-36">
        <Link
          href="/blog"
          className="mb-10 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-white/30 transition hover:text-white/60"
        >
          ← Build log
        </Link>

        <div className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <span
              className="rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide"
              style={{ color: post.accent, backgroundColor: `${post.accent}18` }}
            >
              {post.tag}
            </span>
            <span className="font-mono text-[11px] text-white/25">
              {post.date} · {post.readTime} read
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {post.title}
          </h1>

          <div
            className="mt-6 h-0.5 w-12 rounded-full"
            style={{ backgroundColor: post.accent }}
          />
        </div>

        <article>
          {post.content.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>

        <div className="mt-16 border-t border-white/10 pt-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-white/30 transition hover:text-white/60"
          >
            ← All posts
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
