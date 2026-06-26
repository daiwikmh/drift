// Browser gasless USDC payment (x402 "exact" / EIP-3009). The buyer signs a
// transferWithAuthorization — NO transaction, NO gas, NO keys handed over — and the
// hosted facilitator (via the DRIFT gateway) submits it on Avalanche Fuji. This is
// the machine-native rail: an agent can pay with a single signature. Flow:
// POST → 402 + USDC terms → sign → replay with X-PAYMENT → response.
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { avalancheFuji } from "viem/chains";
import { switchWalletNetwork } from "./network";

const RPC = "https://api.avax-test.network/ext/bc/C/rpc";
const USDC = "0x5425890298aed601595a70AB815c96711a31Bc65" as const;
const CHAIN_ID = 43113;

const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC) });

const nameVersionAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
function injected(): Eth {
  const eth = (globalThis as { ethereum?: Eth }).ethereum;
  if (!eth) throw new Error("No wallet found — install Core or MetaMask");
  return eth;
}

function randomNonce(): `0x${string}` {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return `0x${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

// The token's EIP-712 domain (name + version) is read on-chain so the signature
// hashes identically to what the facilitator verifies. version() is absent on some
// forks — default to "2" (FiatTokenV2).
let cachedDomain: { name: string; version: string } | null = null;
async function usdcDomain(): Promise<{ name: string; version: string }> {
  if (cachedDomain) return cachedDomain;
  const name = (await publicClient.readContract({ address: USDC, abi: nameVersionAbi, functionName: "name" })) as string;
  let version = "2";
  try {
    version = (await publicClient.readContract({ address: USDC, abi: nameVersionAbi, functionName: "version" })) as string;
  } catch {
    /* keep default */
  }
  cachedDomain = { name, version };
  return cachedDomain;
}

type Accept = {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  payTo: `0x${string}`;
  maxTimeoutSeconds?: number;
  asset?: `0x${string}`;
};

export type PaidResponse = {
  status: number;
  json: unknown;
  txHash?: `0x${string}`;
  priceUsdc?: number;
};

// Pay (if challenged) and replay. Returns the upstream response plus the settlement
// tx hash decoded from X-PAYMENT-RESPONSE. Throws on unrecoverable errors.
export async function payAndCall(
  endpoint: string,
  body: unknown,
  account: `0x${string}`
): Promise<PaidResponse> {
  const payload = JSON.stringify(body ?? {});
  const headers = { "Content-Type": "application/json" };

  const first = await fetch(endpoint, { method: "POST", headers, body: payload });
  if (first.status !== 402) {
    const j = await first.json().catch(() => ({}));
    if (first.ok) return { status: first.status, json: j };
    throw new Error((j as { error?: string }).error || `endpoint returned ${first.status}`);
  }

  const challenge = (await first.json()) as { accepts?: Accept[] };
  const req = (challenge.accepts ?? []).find((a) => a.scheme === "exact");
  if (!req) throw new Error("endpoint does not accept USDC (x402 exact)");

  // USDC settlement happens on Fuji — pay there regardless of the global toggle.
  await switchWalletNetwork("testnet");
  const wallet = createWalletClient({ account, chain: avalancheFuji, transport: custom(injected()) });
  const domain = await usdcDomain();

  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: account,
    to: req.payTo,
    value: req.maxAmountRequired,
    validAfter: "0",
    validBefore: String(now + (req.maxTimeoutSeconds ?? 120)),
    nonce: randomNonce(),
  };

  const signature = await wallet.signTypedData({
    account,
    domain: { name: domain.name, version: domain.version, chainId: CHAIN_ID, verifyingContract: USDC },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`,
    },
  });

  const x402Payload = {
    x402Version: 1,
    scheme: "exact",
    network: req.network,
    payload: { signature, authorization },
  };
  const header = btoa(JSON.stringify(x402Payload));

  const paid = await fetch(endpoint, {
    method: "POST",
    headers: { ...headers, "X-PAYMENT": header },
    body: payload,
  });
  const json = await paid.json().catch(() => ({}));
  if (!paid.ok) throw new Error((json as { error?: string }).error || `unlock failed ${paid.status}`);

  let txHash: `0x${string}` | undefined;
  const pr = paid.headers.get("X-PAYMENT-RESPONSE");
  if (pr) {
    try {
      txHash = (JSON.parse(atob(pr)) as { txHash?: `0x${string}` }).txHash;
    } catch {
      /* ignore */
    }
  }
  return { status: paid.status, json, txHash, priceUsdc: Number(req.maxAmountRequired) / 1e6 };
}
