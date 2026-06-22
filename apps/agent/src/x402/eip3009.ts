// The EIP-712 typed-data for EIP-3009 `transferWithAuthorization`. Shared by the
// client (signing) and the server (verifying), so both sides hash identically.
import { FUJI } from "../chain/addresses.js";
import { ASSET, type Authorization } from "./types.js";

export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export function typedData(auth: Authorization, domain: { name: string; version: string }) {
  return {
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: FUJI.chainId,
      verifyingContract: ASSET,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from: auth.from,
      to: auth.to,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce,
    },
  };
}
