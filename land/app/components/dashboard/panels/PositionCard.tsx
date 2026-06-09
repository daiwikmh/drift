"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useDripPosition } from "../../../lib/hooks";
import { usd } from "../../../lib/format";
import { Card, Awaiting } from "../primitives";

// The live drip counter. Between on-chain reads it measures the real share-price
// growth rate (Δ sharePrice / Δt) and extrapolates linearly — no assumed APY.
export function PositionCard() {
  const { isConnected } = useAccount();
  const pos = useDripPosition();
  const [display, setDisplay] = useState(0);

  const last = useRef<{ price: number; t: number } | null>(null);
  const prev = useRef<{ price: number; t: number } | null>(null);

  useEffect(() => {
    if (!pos.deployed || !pos.sharePrice) return;
    const now = Date.now();
    if (last.current?.price !== pos.sharePrice) {
      prev.current = last.current;
      last.current = { price: pos.sharePrice, t: now };
    }
  }, [pos.deployed, pos.sharePrice]);

  useEffect(() => {
    if (!pos.deployed || !pos.shares) return;
    let raf: number;
    const tick = () => {
      const l = last.current;
      const p = prev.current;
      let price = l?.price ?? pos.sharePrice ?? 0;
      if (l && p && l.t > p.t) {
        const ratePerMs = (l.price - p.price) / (l.t - p.t);
        price = l.price + ratePerMs * (Date.now() - l.t);
      }
      setDisplay(pos.shares * price);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pos.deployed, pos.shares, pos.sharePrice]);

  return (
    <Card title="Your position" subtitle="Live value, dripping in real time">
      {!pos.deployed ? (
        <Awaiting what="DripVault (NEXT_PUBLIC_DRIP_VAULT)" />
      ) : !isConnected ? (
        <p className="py-8 text-sm text-ink/55">
          Connect your wallet to watch your position drip.
        </p>
      ) : pos.loading ? (
        <p className="py-8 text-sm text-ink/45">Reading vault…</p>
      ) : pos.shares === 0 ? (
        <p className="py-8 text-sm text-ink/55">
          No position yet — deposit to start the drip.
        </p>
      ) : (
        <div className="relative overflow-hidden">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#1f7a3d]">
            ▪ Live
          </span>
          <div className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight text-ink">
            {usd(display, 6)}
          </div>
          <div className="mt-3 flex gap-6 font-mono text-xs text-ink/50">
            <span>
              {pos.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
              shares
            </span>
            <span>@ {usd(pos.sharePrice, 6)}/share</span>
          </div>
        </div>
      )}
    </Card>
  );
}
