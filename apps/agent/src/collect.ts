import { formatUnits } from "viem";
import {
  addresses,
  agentControllerAbi,
  assetRegistryAbi,
  erc20Abi,
  aaveDataProviderAbi,
} from "@drip/shared";
import { publicClient } from "./chain";
import type { ConstraintState, VenueSignal } from "./types";

// Read the on-chain constraint state the optimizer must respect.
export async function collectConstraints(): Promise<ConstraintState | undefined> {
  const ctrl = addresses.agentController;
  if (!ctrl) return undefined;
  const base = { address: ctrl, abi: agentControllerAbi } as const;
  const [treasuryFloorBps, correlationCapBps, maxRebalanceBps, nextEvalTimestamp] =
    await Promise.all([
      publicClient.readContract({ ...base, functionName: "treasuryFloorBps" }),
      publicClient.readContract({ ...base, functionName: "correlationCapBps" }),
      publicClient.readContract({ ...base, functionName: "maxRebalanceBps" }),
      publicClient.readContract({ ...base, functionName: "nextEvalTimestamp" }),
    ]);
  return {
    treasuryFloorBps: Number(treasuryFloorBps),
    correlationCapBps: Number(correlationCapBps),
    maxRebalanceBps: Number(maxRebalanceBps),
    nextEvalTimestamp: Number(nextEvalTimestamp),
  };
}

// Enumerate whitelisted assets from the AssetRegistry and read each one's
// supply APY from the Aave data provider (when configured).
export async function collectVenues(): Promise<VenueSignal[]> {
  const registry = addresses.assetRegistry;
  if (!registry) return [];

  const count = await publicClient.readContract({
    address: registry,
    abi: assetRegistryAbi,
    functionName: "assetCount",
  });

  const venues: VenueSignal[] = [];
  for (let i = 0n; i < count; i++) {
    const asset = await publicClient.readContract({
      address: registry,
      abi: assetRegistryAbi,
      functionName: "assetAt",
      args: [i],
    });
    const symbol = await publicClient.readContract({
      address: asset,
      abi: erc20Abi,
      functionName: "symbol",
    });

    let supplyApy: number | undefined;
    if (addresses.aaveDataProvider) {
      const reserve = await publicClient.readContract({
        address: addresses.aaveDataProvider,
        abi: aaveDataProviderAbi,
        functionName: "getReserveData",
        args: [asset],
      });
      // liquidityRate is index 5, in ray (1e27).
      supplyApy = Number(formatUnits(reserve[5], 27));
    }

    venues.push({ asset, symbol, supplyApy, price: undefined });
  }
  return venues;
}
