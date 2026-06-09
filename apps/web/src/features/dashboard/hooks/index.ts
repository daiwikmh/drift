"use client";

import { useAccount, useReadContract, useReadContracts, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";
import {
  addresses,
  subgraphUrl,
  dripVaultAbi,
  agentControllerAbi,
  streakManagerAbi,
  reputationRegistryAbi,
  erc20Abi,
  aaveDataProviderAbi,
} from "@/lib/contracts";
import { fetchEthenaYield, fetchPythPrices } from "@/services/external";

const REFETCH = 12_000; // ~ Mantle block cadence

// --- User position in the DripVault ---------------------------------------
export function useDripPosition() {
  const { address } = useAccount();
  const vault = addresses.dripVault;
  const deployed = !!vault;

  const { data: decimals } = useReadContract({
    address: vault,
    abi: dripVaultAbi,
    functionName: "decimals",
    query: { enabled: deployed },
  });

  const oneShare = decimals != null ? 10n ** BigInt(decimals) : undefined;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: vault, abi: dripVaultAbi, functionName: "totalAssets" },
      { address: vault, abi: dripVaultAbi, functionName: "totalSupply" },
      { address: vault, abi: dripVaultAbi, functionName: "balanceOf", args: [address ?? "0x0"] },
      { address: vault, abi: dripVaultAbi, functionName: "convertToAssets", args: [oneShare ?? 0n] },
    ],
    query: { enabled: deployed && oneShare != null, refetchInterval: REFETCH },
  });

  if (!deployed) return { deployed, loading: false } as const;

  const dec = decimals ?? 18;
  const shares = (data?.[2]?.result as bigint) ?? 0n;
  const sharePriceRaw = (data?.[3]?.result as bigint) ?? 0n;
  const sharePrice = Number(formatUnits(sharePriceRaw, dec)); // assets per 1 share
  const sharesNum = Number(formatUnits(shares, dec));

  return {
    deployed,
    loading: isLoading,
    decimals: dec,
    shares: sharesNum,
    sharePrice,
    valueAssets: sharesNum * sharePrice,
    totalAssets: Number(formatUnits((data?.[0]?.result as bigint) ?? 0n, dec)),
    totalSupply: Number(formatUnits((data?.[1]?.result as bigint) ?? 0n, dec)),
  } as const;
}

// --- Current on-chain allocation (AgentController) -------------------------
export function useAllocation() {
  const ctrl = addresses.agentController;
  const deployed = !!ctrl;

  const { data, isLoading } = useReadContract({
    address: ctrl,
    abi: agentControllerAbi,
    functionName: "getAllocation",
    query: { enabled: deployed, refetchInterval: REFETCH },
  });

  const [assetAddrs, weightsBps] = (data as [Address[], bigint[]] | undefined) ?? [[], []];

  // Resolve token symbols for the assets in the allocation.
  const { data: symbols } = useReadContracts({
    contracts: assetAddrs.map((a) => ({ address: a, abi: erc20Abi, functionName: "symbol" as const })),
    query: { enabled: assetAddrs.length > 0 },
  });

  const items = assetAddrs.map((addr, i) => ({
    address: addr,
    symbol: (symbols?.[i]?.result as string) ?? `${addr.slice(0, 6)}…`,
    weight: Number(weightsBps[i] ?? 0n) / 10_000,
  }));

  return { deployed, loading: isLoading, items } as const;
}

// --- Agent constraint state -----------------------------------------------
export function useConstraints() {
  const ctrl = addresses.agentController;
  const deployed = !!ctrl;
  const base = { address: ctrl, abi: agentControllerAbi } as const;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...base, functionName: "treasuryFloorBps" },
      { ...base, functionName: "currentTreasuryBps" },
      { ...base, functionName: "correlationCapBps" },
      { ...base, functionName: "currentCorrelationBps" },
      { ...base, functionName: "maxRebalanceBps" },
      { ...base, functionName: "nextEvalTimestamp" },
    ],
    query: { enabled: deployed, refetchInterval: REFETCH },
  });

  const bps = (i: number) => Number((data?.[i]?.result as bigint) ?? 0n) / 10_000;

  return {
    deployed,
    loading: isLoading,
    treasuryFloor: { limit: bps(0), current: bps(1) },
    correlationCap: { limit: bps(2), current: bps(3) },
    maxRebalance: bps(4),
    nextEvalTs: Number((data?.[5]?.result as bigint) ?? 0n),
  } as const;
}

// --- Rebalance log (on-chain events; reason text lives in DA) --------------
export type RebalanceEvent = { id: bigint; reasonHash: `0x${string}`; timestamp: number; txHash: `0x${string}` };

export function useRebalanceLog(limit = 8) {
  const client = usePublicClient();
  const ctrl = addresses.agentController;

  const q = useQuery({
    queryKey: ["rebalance-log", ctrl, limit],
    enabled: !!ctrl && !!client,
    refetchInterval: 60_000,
    queryFn: async (): Promise<RebalanceEvent[]> => {
      const logs = await client!.getContractEvents({
        address: ctrl!,
        abi: agentControllerAbi,
        eventName: "Rebalance",
        fromBlock: "earliest",
        toBlock: "latest",
      });
      return logs
        .map((l) => ({
          id: (l.args.id as bigint) ?? 0n,
          reasonHash: (l.args.reasonHash as `0x${string}`) ?? "0x",
          timestamp: Number((l.args.timestamp as bigint) ?? 0n),
          txHash: l.transactionHash,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    },
  });

  return { deployed: !!ctrl, loading: q.isLoading, events: q.data ?? [] } as const;
}

// --- Streak ---------------------------------------------------------------
export function useStreak() {
  const { address } = useAccount();
  const mgr = addresses.streakManager;
  const deployed = !!mgr;
  const base = { address: mgr, abi: streakManagerAbi } as const;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...base, functionName: "streakOf", args: [address ?? "0x0"] },
      { ...base, functionName: "multiplierBps", args: [address ?? "0x0"] },
      { ...base, functionName: "shieldAvailable", args: [address ?? "0x0"] },
      { ...base, functionName: "weeklyResetTimestamp" },
    ],
    query: { enabled: deployed && !!address, refetchInterval: 30_000 },
  });

  return {
    deployed,
    loading: isLoading,
    days: Number((data?.[0]?.result as bigint) ?? 0n),
    multiplier: Number((data?.[1]?.result as bigint) ?? 0n) / 10_000,
    shieldAvailable: Boolean(data?.[2]?.result),
    weeklyResetTs: Number((data?.[3]?.result as bigint) ?? 0n),
  } as const;
}

// --- Agent reputation (ERC-8004) ------------------------------------------
export function useAgentReputation() {
  const reg = addresses.reputationRegistry;
  const agent = addresses.agent;
  const deployed = !!reg && !!agent;
  const base = { address: reg, abi: reputationRegistryAbi } as const;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...base, functionName: "cumulativeYieldBps", args: [agent ?? "0x0"] },
      { ...base, functionName: "benchmarkYieldBps", args: [agent ?? "0x0"] },
      { ...base, functionName: "sharpeBps", args: [agent ?? "0x0"] },
      { ...base, functionName: "maxDrawdownBps", args: [agent ?? "0x0"] },
      { ...base, functionName: "uptimeBps", args: [agent ?? "0x0"] },
    ],
    query: { enabled: deployed, refetchInterval: 60_000 },
  });

  const sbps = (i: number) => Number((data?.[i]?.result as bigint) ?? 0n) / 10_000;

  return {
    deployed,
    loading: isLoading,
    cumulativeYield: sbps(0),
    benchmarkYield: sbps(1),
    sharpe: sbps(2),
    maxDrawdown: sbps(3),
    uptime: sbps(4),
  } as const;
}

// --- Live external rates / prices -----------------------------------------
export function useExternalRates() {
  return useQuery({
    queryKey: ["external-rates"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [ethena, prices] = await Promise.allSettled([
        fetchEthenaYield(),
        fetchPythPrices(["ETH/USD", "BTC/USD"]),
      ]);
      return {
        ethena: ethena.status === "fulfilled" ? ethena.value : null,
        prices: prices.status === "fulfilled" ? prices.value : [],
      };
    },
  });
}

// --- Aave V3 supply APY for a given asset (optional) ----------------------
export function useAaveApy(asset?: Address) {
  const provider = addresses.aaveDataProvider;
  const { data, isLoading } = useReadContract({
    address: provider,
    abi: aaveDataProviderAbi,
    functionName: "getReserveData",
    args: asset ? [asset] : undefined,
    query: { enabled: !!provider && !!asset, refetchInterval: 60_000 },
  });
  // liquidityRate is field index 5, expressed in ray (1e27) per-second-normalized APR.
  const rate = (data as readonly bigint[] | undefined)?.[5];
  const apr = rate != null ? Number(rate) / 1e27 : undefined;
  return { deployed: !!provider, loading: isLoading, apr } as const;
}

// --- Pool leaderboard (subgraph; empty until indexed) ---------------------
export type LeaderboardRow = { rank: number; account: string; returnBps: number };

export function useLeaderboard(limit = 15) {
  return useQuery({
    queryKey: ["leaderboard", subgraphUrl, limit],
    enabled: !!subgraphUrl,
    refetchInterval: 120_000,
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const res = await fetch(subgraphUrl!, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: `{ poolParticipants(first: ${limit}, orderBy: returnBps, orderDirection: desc) { account returnBps } }`,
        }),
      });
      if (!res.ok) throw new Error(`subgraph ${res.status}`);
      const json = await res.json();
      const rows = json.data?.poolParticipants ?? [];
      return rows.map((r: { account: string; returnBps: string }, i: number) => ({
        rank: i + 1,
        account: r.account,
        returnBps: Number(r.returnBps),
      }));
    },
  });
}
