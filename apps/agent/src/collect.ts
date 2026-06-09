import { formatUnits } from "viem";
import {
  addresses,
  agentControllerAbi,
  assetRegistryAbi,
  erc20Abi,
  aaveDataProviderAbi,
  mantleMainnet,
} from "@drip/shared";
import { publicClient, useMainnet } from "./chain";
import { fetchRwaYields } from "./venues";
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

// Read an asset's supply APY from an Aave v3 data provider; undefined when the
// asset isn't listed there (the read reverts or returns a zeroed reserve).
async function readAaveSupplyApy(
  provider: `0x${string}`,
  asset: `0x${string}`,
): Promise<number | undefined> {
  try {
    const reserve = await publicClient.readContract({
      address: provider,
      abi: aaveDataProviderAbi,
      functionName: "getReserveData",
      args: [asset],
    });
    // liquidityRate is index 5, in ray (1e27).
    const apy = Number(formatUnits(reserve[5], 27));
    return apy > 0 ? apy : undefined;
  } catch {
    return undefined;
  }
}

// Enumerate whitelisted assets from the AssetRegistry and read each one's
// supply APY from the Aave data provider (when configured). Before the
// registry is deployed, fall back to the known Mantle-mainnet RWA venues
// (USDY, mETH) so the pipeline runs on real signals end-to-end.
export async function collectVenues(): Promise<VenueSignal[]> {
  const registry = addresses.assetRegistry;
  if (!registry) {
    if (!useMainnet) return [];
    const provider = addresses.aaveDataProvider ?? mantleMainnet.aaveV3DataProvider;
    const [rwa, usdyAaveApy] = await Promise.all([
      fetchRwaYields(),
      readAaveSupplyApy(provider, mantleMainnet.usdy),
    ]);
    return [
      {
        asset: mantleMainnet.usdy,
        symbol: "USDY",
        // Prefer the on-chain Aave supply rate when USDY is listed there;
        // otherwise the native redemption-price yield from DefiLlama.
        supplyApy: usdyAaveApy ?? rwa.usdy?.apy,
        price: undefined,
      },
      {
        asset: mantleMainnet.meth,
        symbol: "mETH",
        supplyApy: rwa.meth?.apy,
        price: undefined,
      },
    ].filter((v) => v.supplyApy != null);
  }

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

    const provider =
      addresses.aaveDataProvider ??
      (useMainnet ? mantleMainnet.aaveV3DataProvider : undefined);
    const supplyApy = provider
      ? await readAaveSupplyApy(provider, asset)
      : undefined;

    venues.push({ asset, symbol, supplyApy, price: undefined });
  }
  return venues;
}
