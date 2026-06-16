// Canonical on-chain addresses for the agent marketplace, Avalanche Fuji testnet.
//
// ERC-8004 ("Trustless Agents") registries are deployed at deterministic 0x8004…
// addresses — we register AGAINST these, we do not deploy our own. See
// github.com/erc-8004/erc-8004-contracts.

export const FUJI = {
  chainId: 43113,
  name: "avalanche-fuji",
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  explorer: "https://testnet.snowtrace.io",
} as const;

export const ERC8004 = {
  identity: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  reputation: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  // Validation registry address TBD on Fuji — wired when confirmed.
  validation: "" as `0x${string}` | "",
} as const;

// USDC on Fuji — the x402 settlement asset (EIP-3009 transferWithAuthorization).
export const USDC_FUJI = "0x5425890298aed601595a70AB815c96711a31Bc65" as const;
