// Real, executable deposits into EXISTING vaults — starting with Aave V3 on
// Avalanche (addresses verified on-chain). We only auto-execute STABLECOIN reserves
// (USDC) so the dollar amount maps 1:1 to tokens (no price oracle). Everything is a
// real Avalanche MAINNET transaction signed by the user; DRIFT never custodies funds.
import { createPublicClient, createWalletClient, custom, http, parseUnits } from "viem";
import { avalanche } from "viem/chains";
import type { VaultPick } from "./market";

const RPC = "https://api.avax.network/ext/bc/C/rpc";
export const MAINNET_EXPLORER = "https://snowtrace.io";
const CHAIN_HEX = "0xa86a"; // 43114
const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as const;

// Aave V3 Avalanche USDC reserve (verified on-chain).
const USDC = {
  asset: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as `0x${string}`,
  aToken: "0x625E7708f30cA75bfd92586e17077590C60eb4cD" as `0x${string}`,
  decimals: 6,
};

const pub = createPublicClient({ chain: avalanche, transport: http(RPC) });

const erc20 = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const poolAbi = [
  {
    type: "function",
    name: "supply",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }, { type: "address" }, { type: "uint16" }],
    outputs: [],
  },
] as const;

// Can this recommended pick be deposited in-app? (Aave V3 USDC only, for now.)
export function isExecutable(p: VaultPick): boolean {
  return p.project.toLowerCase().includes("aave") && /usdc/i.test(p.symbol);
}

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
function injected(): Eth {
  const eth = (globalThis as { ethereum?: Eth }).ethereum;
  if (!eth) throw new Error("no wallet");
  return eth;
}

async function ensureMainnet() {
  const eth = injected();
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_HEX,
            chainName: "Avalanche C-Chain",
            nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
            rpcUrls: [RPC],
            blockExplorerUrls: [MAINNET_EXPLORER],
          },
        ],
      });
    } else throw e;
  }
}

// Approve (if needed) + supply USDC to Aave V3 on Avalanche mainnet. usd ≈ tokens.
export async function depositAaveUSDC(account: `0x${string}`, usd: number): Promise<`0x${string}`> {
  await ensureMainnet();
  const amount = parseUnits(String(usd), USDC.decimals);
  const wallet = createWalletClient({ account, chain: avalanche, transport: custom(injected()) });

  const allowance = (await pub.readContract({ address: USDC.asset, abi: erc20, functionName: "allowance", args: [account, AAVE_POOL] })) as bigint;
  if (allowance < amount) {
    const approveTx = await wallet.writeContract({ account, chain: avalanche, address: USDC.asset, abi: erc20, functionName: "approve", args: [AAVE_POOL, amount] });
    await pub.waitForTransactionReceipt({ hash: approveTx });
  }
  const hash = await wallet.writeContract({
    account,
    chain: avalanche,
    address: AAVE_POOL,
    abi: poolAbi,
    functionName: "supply",
    args: [USDC.asset, amount, account, 0],
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

// Current Aave V3 USDC position (aToken balance ≈ supplied + interest).
export async function aaveUsdcPosition(account: `0x${string}`): Promise<number> {
  const bal = (await pub.readContract({ address: USDC.aToken, abi: erc20, functionName: "balanceOf", args: [account] })) as bigint;
  return Number(bal) / 10 ** USDC.decimals;
}

// USDC wallet balance on mainnet (so the UI can warn before a deposit).
export async function usdcWalletBalance(account: `0x${string}`): Promise<number> {
  const bal = (await pub.readContract({ address: USDC.asset, abi: erc20, functionName: "balanceOf", args: [account] })) as bigint;
  return Number(bal) / 10 ** USDC.decimals;
}
