"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import BoringAvatar from "boring-avatars";
import { getTelegram, testTelegram } from "@/features/trade/api";
import type { TelegramStatus } from "@/features/trade/types";

const AVATAR_COLORS = ["#9aa8f0", "#a855f7", "#6366f1", "#22d3ee", "#f472b6"];

function Avatar({ name, image, size = 32 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} width={size} height={size} className="shrink-0 rounded-full" style={{ width: size, height: size }} />;
  }
  return <BoringAvatar size={size} name={name} variant="beam" colors={AVATAR_COLORS} />;
}

function TelegramSection() {
  const [tg, setTg] = useState<TelegramStatus | null>(null);
  const [testNote, setTestNote] = useState<string | null>(null);

  useEffect(() => {
    getTelegram().then(setTg).catch(() => setTg(null));
  }, []);

  const sendTest = async () => {
    try {
      await testTelegram();
      setTestNote("sent ✓");
      setTimeout(() => setTestNote(null), 2500);
    } catch {
      setTestNote("failed");
    }
  };

  if (!tg) return null;

  return (
    <div className="border-t border-white/10 px-3.5 py-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-white/30">Telegram</div>
      {tg.enabled ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[12px] text-white/70">
              Connected{tg.username ? ` · @${tg.username}` : ""}
            </span>
          </div>
          <button
            onClick={sendTest}
            className="w-full rounded-md border border-white/10 py-1.5 text-[12px] text-white/60 transition hover:border-white/20 hover:text-white/80"
          >
            {testNote ?? "Send test alert"}
          </button>
        </div>
      ) : tg.configured && tg.username ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-[12px] text-white/55">Not connected yet</span>
          </div>
          <a
            href={`https://t.me/${tg.username}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#229ED9]/20 py-2 text-[12px] font-medium text-[#229ED9] transition hover:bg-[#229ED9]/30"
          >
            <TelegramIcon />
            Connect via Telegram
          </a>
          <p className="text-[10px] leading-relaxed text-white/35">
            Opens @{tg.username} — send <span className="font-mono">/start</span> to bind your chat and receive alerts.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-white/35">Bot not configured on server.</p>
      )}
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
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
          {/* user info */}
          <div className="border-b border-white/10 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={name} image={image} size={34} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{name}</div>
                {email && <div className="truncate text-[11px] text-white/45">{email}</div>}
              </div>
            </div>
          </div>

          {/* Telegram connect */}
          <TelegramSection />

          {/* actions */}
          <div className="border-t border-white/10 py-1">
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
