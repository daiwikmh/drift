import type { Address } from "viem";

// --- Known Mantle-mainnet deployments (chainId 5000) -----------------------
// Third-party contracts that exist today, independent of DRIP. Sources:
//   USDY / mUSD / oracle — docs.ondo.finance/addresses
//   mETH               — token-list.mantle.xyz (chainId 5000)
//   Aave v3            — bgd-labs/aave-address-book AaveV3Mantle.sol
// Verified 2026-06-10. These never apply on testnet — callers must gate on
// chainId and fall back to empty states elsewhere.

export const MANTLE_MAINNET_CHAIN_ID = 5000;

export const mantleMainnet = {
  usdy: "0x5bE26527e817998A7206475496fDE1E68957c5A6" as Address,
  musd: "0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3" as Address,
  // RWADynamicOracle — USDY redemption price (its drift IS the USDY yield).
  usdyDynamicOracle: "0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f" as Address,
  meth: "0xcDA86A272531e8640cD7F1a92c01839911B90bb0" as Address,
  aaveV3Pool: "0x458F293454fE0d67EC0655f3672301301DD51422" as Address,
  aaveV3DataProvider: "0x487c5c669D9eee6057C44973207101276cf73b68" as Address,
} as const;

// DefiLlama yields pool ids (stable UUIDs) for the v1 venues. Verified live
// 2026-06-10 against yields.llama.fi/pools:
//   usdyMantle — project ondo-yield-assets, chain Mantle ($29M TVL)
//   methStaking — project meth-protocol (L1 staking yield mETH accrues)
export const defiLlamaPools = {
  usdyMantle: "b5d7a190-38d2-4fdd-8c14-1fd00c11bce1",
  methStaking: "b9f2f00a-ba96-4589-a171-dde979a23d87",
} as const;
