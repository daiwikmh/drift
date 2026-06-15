"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import BoringAvatar from "boring-avatars";

const AVATAR_COLORS = ["#9aa8f0", "#a855f7", "#6366f1", "#22d3ee", "#f472b6"];

function Avatar({ name, image, size = 32 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} width={size} height={size} className="shrink-0 rounded-full" style={{ width: size, height: size }} />;
  }
  return <BoringAvatar size={size} name={name} variant="beam" colors={AVATAR_COLORS} />;
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Not signed in → a simple sign-in entry point.
  if (status !== "loading" && !session) {
    return (
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-white/60 transition hover:bg-white/[0.05] hover:text-white"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Sign in
        </button>
      </div>
    );
  }

  const name = session?.user?.name ?? session?.user?.email ?? "Account";
  const email = session?.user?.email ?? undefined;
  const image = session?.user?.image;

  const handleSignOut = async () => {
    setOpen(false);
    await signOut({ redirect: false });
    router.replace("/login");
  };

  return (
    <div ref={ref} className="relative border-t border-white/10 p-3">
      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-3 right-3 z-30 overflow-hidden rounded-xl border border-white/10 bg-[#121319] shadow-2xl shadow-black/50">
          <div className="border-b border-white/10 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={name} image={image} size={34} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{name}</div>
                {email && <div className="truncate text-[11px] text-white/45">{email}</div>}
              </div>
            </div>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard/connection"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-white/80 transition hover:bg-white/[0.05]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#9aa8f0]">
                <path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0zM12 16v6" />
              </svg>
              Bybit connection
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full px-3.5 py-2 text-left text-[13px] text-red-400 transition hover:bg-white/[0.05]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.05]"
      >
        <Avatar name={name} image={image} />
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-[13px] font-medium text-white">{name}</div>
          {email && <div className="truncate text-[11px] text-white/40">{email}</div>}
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white/40">
          <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
        </svg>
      </button>
    </div>
  );
}
