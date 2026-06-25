// Real ERC-8004 interactions on Avalanche Fuji: register an agent's identity,
// read/write reputation. ABIs are the verified on-chain ABIs of the canonical
// registries (src/chain/abi). Everything here is a real Fuji read or transaction.
import { formatEther, type Abi } from "viem";
import { publicClient, walletFor } from "./client.js";
import { ERC8004 } from "./addresses.js";
import identityJson from "./abi/identity.json" with { type: "json" };
import reputationJson from "./abi/reputation.json" with { type: "json" };

const identityAbi = identityJson as unknown as Abi;
const reputationAbi = reputationJson as unknown as Abi;
const ZERO_HASH = ("0x" + "00".repeat(32)) as `0x${string}`;

export async function avaxBalance(address: `0x${string}`): Promise<string> {
  const wei = await publicClient.getBalance({ address });
  return formatEther(wei);
}

// How many agent NFTs this address owns (>0 ⇒ registered at least once).
export async function isRegistered(address: `0x${string}`): Promise<boolean> {
  const bal = (await publicClient.readContract({
    address: ERC8004.identity,
    abi: identityAbi,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return bal > 0n;
}

// Register the agent on the ERC-8004 Identity Registry. Returns the minted agentId
// and the real tx hash. agentURI points to the agent's registration metadata.
export async function register(
  privateKey: `0x${string}`,
  agentURI: string
): Promise<{ agentId: bigint; txHash: `0x${string}` }> {
  const { account, wallet } = walletFor(privateKey);
  const { request, result } = await publicClient.simulateContract({
    account,
    address: ERC8004.identity,
    abi: identityAbi,
    functionName: "register",
    args: [agentURI],
  });
  const txHash = await wallet.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { agentId: result as bigint, txHash };
}

// Post feedback for an agent after a job. value is an integer score (e.g. 0–100),
// valueDecimals 0. Optionally anchor an attestation: feedbackURI references the
// validator's signed attestation and hash is the sha256 of the work it covers — so
// the on-chain feedback is provably backed by an independent validation, not just
// asserted. Returns the real tx hash.
export async function giveFeedback(
  privateKey: `0x${string}`,
  agentId: bigint,
  value: number,
  tag: string,
  feedbackURI = "",
  hash: `0x${string}` = ZERO_HASH
): Promise<`0x${string}`> {
  const { account, wallet } = walletFor(privateKey);
  const { request } = await publicClient.simulateContract({
    account,
    address: ERC8004.reputation,
    abi: reputationAbi,
    functionName: "giveFeedback",
    args: [agentId, BigInt(value), 0, tag, "", feedbackURI, "", hash],
  });
  const txHash = await wallet.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

// Read an agent's on-chain identity: owner + registration metadata (tokenURI).
export async function getIdentity(agentId: bigint): Promise<{ owner: string; tokenURI: string }> {
  const [owner, tokenURI] = await Promise.all([
    publicClient.readContract({ address: ERC8004.identity, abi: identityAbi, functionName: "ownerOf", args: [agentId] }),
    publicClient.readContract({ address: ERC8004.identity, abi: identityAbi, functionName: "tokenURI", args: [agentId] }),
  ]);
  return { owner: owner as string, tokenURI: tokenURI as string };
}

// Parse the registration metadata an agent stored in its ERC-8004 tokenURI. This
// is the canonical, on-chain source for a provider's compute endpoint + price —
// the relay only tells us who is live; the chain says how to reach + pay them.
export type OnchainProvider = {
  agentId: bigint;
  owner: string;
  name?: string;
  skills?: string[];
  endpoint?: string;
  priceAvax?: number;
  priceUsdc?: number;
};

export async function resolveProvider(agentId: bigint): Promise<OnchainProvider> {
  const { owner, tokenURI } = await getIdentity(agentId);
  let meta: Record<string, unknown> = {};
  const plain = "data:application/json,";
  const b64 = "data:application/json;base64,";
  try {
    if (tokenURI.startsWith(plain)) meta = JSON.parse(decodeURIComponent(tokenURI.slice(plain.length)));
    else if (tokenURI.startsWith(b64)) meta = JSON.parse(Buffer.from(tokenURI.slice(b64.length), "base64").toString());
  } catch {
    /* leave meta empty */
  }
  return {
    agentId,
    owner,
    name: meta.name as string | undefined,
    skills: meta.skills as string[] | undefined,
    endpoint: meta.endpoint as string | undefined,
    priceAvax: meta.priceAvax as number | undefined,
    priceUsdc: meta.priceUsdc as number | undefined,
  };
}

// Aggregate reputation for an agent: number of feedbacks + average score.
export async function getReputation(
  agentId: bigint
): Promise<{ count: number; avg: number } | null> {
  const clients = (await publicClient.readContract({
    address: ERC8004.reputation,
    abi: reputationAbi,
    functionName: "getClients",
    args: [agentId],
  })) as `0x${string}`[];
  if (clients.length === 0) return { count: 0, avg: 0 };
  const [count, summaryValue, decimals] = (await publicClient.readContract({
    address: ERC8004.reputation,
    abi: reputationAbi,
    functionName: "getSummary",
    args: [agentId, clients, "", ""],
  })) as [bigint, bigint, number];
  const n = Number(count);
  const total = Number(summaryValue) / 10 ** Number(decimals);
  return { count: n, avg: n ? total / n : 0 };
}
