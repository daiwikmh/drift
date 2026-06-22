// Browser side of the DRIFT compute marketplace. Discovery reads the relay's
// /providers list; buying pays native AVAX on Avalanche Fuji from the connected
// wallet, then unlocks the provider's x402-gated /infer endpoint with the tx hash.
import { createPublicClient, createWalletClient, custom, formatEther, http } from "viem";
import { avalancheFuji } from "viem/chains";
import { getReputation, type Reputation } from "./chain";

const FUJI_HEX = "0xa869"; // 43113
const RPC = "https://api.avax-test.network/ext/bc/C/rpc";
const USDC = "0x5425890298aed601595a70AB815c96711a31Bc65" as const;
export const EXPLORER = "https://testnet.snowtrace.io";

export const RELAY_HTTP =
  process.env.NEXT_PUBLIC_RELAY_HTTP || "http://localhost:8787";

const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC) });

// Native AVAX + USDC balance for the connected wallet (shown in the topbar).
export async function usdcAvaxBalances(address: `0x${string}`): Promise<{ avax: number; usdc: number }> {
  const [wei, usdc] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: USDC,
      abi: [
        {
          type: "function",
          name: "balanceOf",
          stateMutability: "view",
          inputs: [{ name: "a", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [address],
    }) as Promise<bigint>,
  ]);
  return { avax: Number(formatEther(wei)), usdc: Number(usdc) / 1e6 };
}

type Eth = {
  request: (a: { method: string; params?: unknown[] }) => Promise<any>;
};
function injected(): Eth {
  const eth = (globalThis as { ethereum?: Eth }).ethereum;
  if (!eth) throw new Error("No wallet found — install Core or MetaMask");
  return eth;
}

export async function connectWallet(): Promise<`0x${string}`> {
  const eth = injected();
  const [account] = (await eth.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: FUJI_HEX }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: FUJI_HEX,
            chainName: "Avalanche Fuji",
            nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
            rpcUrls: [RPC],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      });
    } else throw e;
  }
  return account;
}

export type Provider = {
  addr: string;
  name: string;
  skills: string[];
  priceUsdc?: number;
  priceAvax?: number;
  model?: string;
  agentId?: number;
  // derived: the relay-proxied URL buyers POST to (provider needs no public URL)
  endpoint: string;
  rep?: Reputation | null;
};

// Live providers from the relay, enriched with on-chain reputation, then ranked:
// best-rated first, registered before off-chain. Inference is always reached
// through the relay proxy at ${RELAY_HTTP}/infer/<addr>.
export async function listProviders(): Promise<Provider[]> {
  const r = await fetch(`${RELAY_HTTP}/providers`);
  const j = (await r.json()) as { providers?: Omit<Provider, "endpoint" | "rep">[] };
  const live = (j.providers ?? []).filter((p) => p.skills.length);
  const enriched = await Promise.all(
    live.map(async (p) => {
      const rep = p.agentId === undefined ? null : await getReputation(p.agentId);
      return { ...p, rep, endpoint: `${RELAY_HTTP}/infer/${p.addr}` } as Provider;
    })
  );
  enriched.sort(
    (a, b) => (b.rep?.avg ?? -1) - (a.rep?.avg ?? -1) || (b.rep?.count ?? -1) - (a.rep?.count ?? -1)
  );
  return enriched;
}

export type BuyResult = { result: string; model: string | null; txHash: `0x${string}`; paidWith?: string };

// Pay native AVAX, then unlock the inference. Returns the result + settlement tx.
export async function buyInference(
  endpoint: string,
  prompt: string,
  account: `0x${string}`,
  model?: string
): Promise<BuyResult> {
  const wallet = createWalletClient({ account, chain: avalancheFuji, transport: custom(injected()) });
  const body = JSON.stringify({ prompt, model });
  const headers = { "Content-Type": "application/json" };

  const first = await fetch(endpoint, { method: "POST", headers, body });
  if (first.status !== 402) {
    if (first.ok) return (await first.json()) as BuyResult;
    throw new Error(`endpoint returned ${first.status}`);
  }
  const { accepts } = (await first.json()) as {
    accepts: { scheme: string; network: string; payTo: `0x${string}`; maxAmountRequired: string }[];
  };
  const req = accepts.find((a) => a.scheme === "avax-native");
  if (!req) throw new Error("provider does not accept AVAX");

  const txHash = await wallet.sendTransaction({
    account,
    chain: avalancheFuji,
    to: req.payTo,
    value: BigInt(req.maxAmountRequired),
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const header = btoa(JSON.stringify({ scheme: "avax-native", network: req.network, txHash }));
  const paid = await fetch(endpoint, { method: "POST", headers: { ...headers, "X-PAYMENT": header }, body });
  if (!paid.ok) throw new Error(`unlock failed ${paid.status}: ${(await paid.text()).slice(0, 160)}`);
  return { ...((await paid.json()) as BuyResult), txHash };
}
