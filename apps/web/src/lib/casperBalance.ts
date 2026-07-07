// Real on-chain native CSPR balance for the Topbar/WalletContext display.
// Dynamically imports casper-js-sdk — see the note in casper.ts.
import { RPC_URL, loadCasperSdk } from "./casper";

export async function csprBalance(accountHashAddress: string): Promise<number> {
  try {
    const { RpcClient, HttpHandler, AccountHash, PurseIdentifier } = await loadCasperSdk();
    const client = new RpcClient(new HttpHandler(RPC_URL));
    const accountHash = AccountHash.fromString(accountHashAddress);
    const purseIdentifier = PurseIdentifier.fromAccountHash(accountHash);
    const result = await client.queryLatestBalance(purseIdentifier);
    if (!result) return 0;
    return Number(BigInt(result.balance.toString())) / 1e9;
  } catch {
    return 0;
  }
}
