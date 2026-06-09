"use client";

import { useAccount } from "wagmi";
import { useLeaderboard } from "@/features/dashboard/hooks";
import { subgraphUrl } from "@drip/shared";
import { pct, shortAddr } from "@/lib/format";
import { Card, Awaiting, Skeleton, Empty } from "../primitives";

export function LeaderboardCard() {
  const { address } = useAccount();
  const { data, isLoading } = useLeaderboard();

  return (
    <Card
      title="Pool leaderboard"
      subtitle="Top 15 by weekly return — top 10 share the yield"
    >
      {!subgraphUrl ? (
        <Awaiting what="subgraph endpoint (NEXT_PUBLIC_SUBGRAPH_URL)" />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Empty>No pool participants indexed yet.</Empty>
      ) : (
        <ol className="space-y-0.5">
          {data.map((row) => {
            const isUser =
              address && row.account.toLowerCase() === address.toLowerCase();
            const payout = row.rank <= 10;
            return (
              <li
                key={row.account}
                className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
                  isUser
                    ? "bg-lime/25 ring-1 ring-[#1f7a3d]/30"
                    : payout
                    ? "bg-sage/40"
                    : ""
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-5 font-mono text-xs ${
                      payout ? "text-[#1f7a3d]" : "text-ink/35"
                    }`}
                  >
                    {row.rank}
                  </span>
                  <span
                    className={`font-mono ${isUser ? "text-[#1f7a3d]" : "text-ink/70"}`}
                  >
                    {isUser ? "you" : shortAddr(row.account)}
                  </span>
                </span>
                <span className="font-mono tabular-nums text-ink/70">
                  {pct(row.returnBps / 10_000)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
