// ERC-8004 reads/writes from the browser: resolve a provider's canonical endpoint
// from its on-chain identity, read its reputation, and post feedback after a buy.
// The chain is the source of truth; the relay only reports who is live.
import { createPublicClient, createWalletClient, custom, http, type Abi } from "viem";
import { avalancheFuji } from "viem/chains";

const RPC = "https://api.avax-test.network/ext/bc/C/rpc";
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC) });

export const ERC8004 = {
  identity: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  reputation: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
} as const;
const ZERO_HASH = ("0x" + "00".repeat(32)) as `0x${string}`;

const identityAbi = [
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "agentURI", type: "string" }], outputs: [{ type: "uint256" }] },
] as const satisfies Abi;

const reputationAbi = [
  { type: "function", name: "getClients", stateMutability: "view", inputs: [{ name: "agentId", type: "uint256" }], outputs: [{ type: "address[]" }] },
  {
    type: "function",
    name: "getSummary",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const satisfies Abi;

export type Reputation = { count: number; avg: number };

export async function getReputation(agentId: number): Promise<Reputation | null> {
  try {
    const clients = (await publicClient.readContract({
      address: ERC8004.reputation,
      abi: reputationAbi,
      functionName: "getClients",
      args: [BigInt(agentId)],
    })) as `0x${string}`[];
    if (clients.length === 0) return { count: 0, avg: 0 };
    const [count, value, decimals] = (await publicClient.readContract({
      address: ERC8004.reputation,
      abi: reputationAbi,
      functionName: "getSummary",
      args: [BigInt(agentId), clients, "", ""],
    })) as [bigint, bigint, number];
    const n = Number(count);
    const total = Number(value) / 10 ** Number(decimals);
    return { count: n, avg: n ? total / n : 0 };
  } catch {
    return null;
  }
}

// The on-chain endpoint an agent registered in its ERC-8004 metadata.
export async function resolveEndpoint(agentId: number): Promise<string | null> {
  try {
    const uri = (await publicClient.readContract({
      address: ERC8004.identity,
      abi: identityAbi,
      functionName: "tokenURI",
      args: [BigInt(agentId)],
    })) as string;
    const plain = "data:application/json,";
    const meta = uri.startsWith(plain) ? JSON.parse(decodeURIComponent(uri.slice(plain.length))) : {};
    return (meta.endpoint as string) ?? null;
  } catch {
    return null;
  }
}

function injectedWallet(account: `0x${string}`) {
  const eth = (globalThis as { ethereum?: Parameters<typeof custom>[0] }).ethereum;
  if (!eth) throw new Error("no wallet");
  return createWalletClient({ account, chain: avalancheFuji, transport: custom(eth) });
}

export async function giveFeedback(
  account: `0x${string}`,
  agentId: number,
  value: number,
  tag = "compute"
): Promise<`0x${string}`> {
  const { request } = await publicClient.simulateContract({
    account,
    address: ERC8004.reputation,
    abi: reputationAbi,
    functionName: "giveFeedback",
    args: [BigInt(agentId), BigInt(value), 0, tag, "", "", "", ZERO_HASH],
  });
  return injectedWallet(account).writeContract(request);
}

// Is this wallet registered as an ERC-8004 agent? (owns >0 identity NFTs)
export async function isRegistered(address: `0x${string}`): Promise<boolean> {
  const bal = (await publicClient.readContract({
    address: ERC8004.identity,
    abi: identityAbi,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return bal > 0n;
}

// Mint an ERC-8004 identity for the connected wallet. Returns the minted agentId
// (read from the simulation) and the real tx hash.
export async function registerIdentity(
  account: `0x${string}`,
  meta: { name: string }
): Promise<{ agentId: number; txHash: `0x${string}` }> {
  const uri = `data:application/json,${encodeURIComponent(
    JSON.stringify({ name: meta.name, address: account, skills: [] })
  )}`;
  const { request, result } = await publicClient.simulateContract({
    account,
    address: ERC8004.identity,
    abi: identityAbi,
    functionName: "register",
    args: [uri],
  });
  const txHash = await injectedWallet(account).writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { agentId: Number(result as bigint), txHash };
}
