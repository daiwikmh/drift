// x402 — agent-native payments. We implement the "exact" EVM scheme directly
// against USDC on Avalanche Fuji (EIP-3009 transferWithAuthorization): the client
// signs a transfer authorization (no gas), the resource server (acting as its own
// facilitator) verifies it and submits the transfer on-chain. Nothing is mocked —
// settlement is a real Fuji transaction whose hash is returned to the caller.
import { USDC_FUJI, FUJI } from "../chain/addresses.js";

export const X402_VERSION = 1;
export const NETWORK = FUJI.name; // "avalanche-fuji"

// What a resource server demands in its 402 response (the `accepts` entry).
export type PaymentRequirements = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string; // atomic USDC (6 decimals)
  resource: string;
  description: string;
  mimeType: string;
  payTo: `0x${string}`;
  maxTimeoutSeconds: number;
  asset: `0x${string}`;
  extra: { name: string; version: string }; // EIP-712 domain of the USDC token
};

// The signed EIP-3009 authorization the client puts in the X-PAYMENT header.
export type Authorization = {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string; // atomic USDC
  validAfter: string; // unix seconds
  validBefore: string; // unix seconds
  nonce: `0x${string}`; // bytes32
};

export type PaymentPayload = {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: { signature: `0x${string}`; authorization: Authorization };
};

// Returned to the client (X-PAYMENT-RESPONSE header) after settlement.
export type SettleResponse = {
  success: boolean;
  txHash?: `0x${string}`;
  network: string;
  payer?: `0x${string}`;
  error?: string;
};

export const ASSET = USDC_FUJI as `0x${string}`;
