"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/dashboard/WalletContext";
import { Card, Stat } from "@/components/dashboard/ui";
import { ListingCard } from "@/components/dashboard/EndpointCard";
import { listListings, type Listing } from "@/lib/listings";

export default function Marketplace() {
  const { account, connect, connecting } = useWallet();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    listListings()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const totalCalls = listings.reduce((s, l) => s + l.calls, 0);

  return (
    <div className="mx-auto max-w-4xl px-8 py-9">
      <h1 className="font-display text-2xl tracking-tight">Marketplace</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/45">
        Every HTTP API and MCP server listed on DRIFT, from every owner. Pay per call in native CSPR — or test one
        first in the{" "}
        <Link href="/dashboard/playground" className="text-[#9aa8f0] hover:underline">
          Playground
        </Link>
        . Want to sell your own?{" "}
        <Link href="/dashboard" className="text-[#9aa8f0] hover:underline">
          List it here
        </Link>
        .
      </p>

      {listings.length > 0 && (
        <div className="mt-7 grid grid-cols-2 gap-3">
          <Stat label="Endpoints listed" value={listings.length} />
          <Stat label="Calls served" value={totalCalls} />
        </div>
      )}

      <div className="mt-7">
        {loading ? (
          <Card>
            <p className="text-sm text-white/40">Loading…</p>
          </Card>
        ) : listings.length === 0 ? (
          <Card>
            <p className="text-sm text-white/40">
              Nothing listed yet.{" "}
              <Link href="/dashboard" className="text-[#9aa8f0] hover:underline">
                List the first one
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                account={account}
                connect={connect}
                connecting={connecting}
                mine={!!account && l.owner.toLowerCase() === account.toLowerCase()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
