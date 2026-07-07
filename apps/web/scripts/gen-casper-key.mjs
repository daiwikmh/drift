// Generates a fresh Casper Testnet keypair — e.g. for the headless buyer
// script (scripts/x402-buy.mjs's CLIENT_PRIVATE_KEY_PATH). Run this yourself
// locally — the private key is written only to your own disk, never printed
// or sent anywhere by this script.
//
// Usage: node scripts/gen-casper-key.mjs [ed25519|secp256k1] [outfile.pem]
import casperSdk from "casper-js-sdk";
import { writeFileSync } from "fs";

const { PrivateKey, KeyAlgorithm } = casperSdk;

const algoArg = process.argv[2] === "secp256k1" ? "secp256k1" : "ed25519";
const algorithm = algoArg === "secp256k1" ? KeyAlgorithm.SECP256K1 : KeyAlgorithm.ED25519;
const outFile = process.argv[3] || "casper-key.pem";

const key = PrivateKey.generate(algorithm);
const pem = key.toPem();
const publicKeyHex = key.publicKey.toHex();
const accountHash = "00" + key.publicKey.accountHash().toHex();

writeFileSync(outFile, pem, { mode: 0o600 });

// The PEM itself is deliberately NOT printed here — it's a signing key, and
// anything printed to stdout can end up in a terminal scrollback, a CI log,
// or (if run through an assistant) a chat transcript. Open the file yourself.
console.log(`Algorithm: ${algoArg}`);
console.log(`Public key (fund this on the faucet): ${publicKeyHex}`);
console.log(`Account-hash address: ${accountHash}`);
console.log(`\nPrivate key written to ./${outFile} (0600, gitignored) — never commit it, never paste it anywhere.`);
console.log(`Fund the public key above via https://testnet.cspr.live/tools/faucet before using it to pay for anything.`);
