import type {
  BacktestRequest,
  BacktestResponse,
  BotConfig,
  BotStatus,
  ConnectionStatus,
  StrategyInfo,
} from "./types";

// The Python engine (apps/trader). Override with NEXT_PUBLIC_TRADER_URL.
export const TRADER_URL =
  process.env.NEXT_PUBLIC_TRADER_URL ?? "http://localhost:8099";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchStrategies(signal?: AbortSignal): Promise<StrategyInfo[]> {
  return json(await fetch(`${TRADER_URL}/strategies`, { signal }));
}

export async function runBacktest(
  req: BacktestRequest,
  signal?: AbortSignal,
): Promise<BacktestResponse> {
  return json(
    await fetch(`${TRADER_URL}/backtest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal,
    }),
  );
}

// ---- live trading ----

export async function getConnection(signal?: AbortSignal): Promise<ConnectionStatus> {
  return json(await fetch(`${TRADER_URL}/connection`, { signal }));
}

export async function setConnection(
  body: { api_key: string; api_secret: string; testnet: boolean },
): Promise<ConnectionStatus> {
  return json(
    await fetch(`${TRADER_URL}/connection`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function listBots(signal?: AbortSignal): Promise<BotStatus[]> {
  return json(await fetch(`${TRADER_URL}/bots`, { signal }));
}

export async function startBot(config: BotConfig): Promise<BotStatus> {
  return json(
    await fetch(`${TRADER_URL}/bots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    }),
  );
}

export async function stopBot(botId: string): Promise<void> {
  const res = await fetch(`${TRADER_URL}/bots/${botId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText);
}

// ws:// URL for a bot's live status stream.
export function botStreamUrl(botId: string): string {
  return `${TRADER_URL.replace(/^http/, "ws")}/bots/${botId}/stream`;
}
