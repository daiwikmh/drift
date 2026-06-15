// Mirrors the pydantic schemas returned by apps/trader (snake_case preserved).

export type ParamSpec = {
  key: string;
  label: string;
  type: string;
  default: number;
  min: number;
  max: number;
  step: number;
};

export type StrategyInfo = {
  id: string;
  name: string;
  type: string;
  blurb: string;
  params: ParamSpec[];
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Market = {
  symbol: string;
  last: number;
  change24h: number; // fraction
  high24h: number;
  low24h: number;
  volume24h: number;
};

export type KlinesResponse = {
  symbol: string;
  timeframe: string;
  candles: Candle[];
};

export type EquityPoint = {
  time: number;
  equity: number;
  drawdown: number;
};

export type TradeMarker = {
  time: number;
  side: "long" | "short" | "exit";
  price: number;
};

export type Metrics = {
  total_return: number;
  sharpe: number;
  win_rate: number;
  max_drawdown: number;
  num_trades: number;
};

export type BacktestResponse = {
  strategy: string;
  symbol: string;
  timeframe: string;
  candles: Candle[];
  equity_curve: EquityPoint[];
  trades: TradeMarker[];
  metrics: Metrics;
};

export type SliceMetrics = {
  total_return: number;
  sharpe: number;
  max_drawdown: number;
  num_trades: number;
};

export type OptimizeResult = {
  strategy: string;
  name: string;
  params: Record<string, number>;
  in_sample: SliceMetrics;
  out_of_sample: SliceMetrics;
  verdict: "robust" | "overfit" | "weak";
  equity: EquityPoint[];
  split_index: number;
};

export type OptimizeResponse = {
  symbol: string;
  timeframe: string;
  train_frac: number;
  results: OptimizeResult[];
};

export type BacktestRequest = {
  strategy: string;
  symbol: string;
  timeframe: string;
  params: Record<string, number>;
  bars: number;
};

// ---- live trading ----

export type ConnectionStatus = {
  connected: boolean;
  testnet: boolean;
  balance: number | null;
  error: string | null;
};

export type TelegramStatus = {
  enabled: boolean;
  configured: boolean;
  chat_id: string | null;
  username: string | null;
};

export type BotConfig = {
  strategy: string;
  symbol: string;
  timeframe: string;
  params: Record<string, number>;
  qty: number;
  max_drawdown: number;
};

export type Fill = {
  ts: number;
  side: string;
  qty: number;
  price: number;
  target: number;
  flatten?: boolean;
};

export type BotStatus = {
  id: string;
  config: BotConfig;
  running: boolean;
  position: number;
  equity: number;
  peak_equity: number;
  drawdown: number;
  last_signal: string | null;
  last_price: number | null;
  fills: Fill[];
  error: string | null;
  last_chain_tx: string | null;
  chain_vetoed: boolean;
};

export type ChainInfo = {
  enabled: boolean;
  address: string | null;
  chain_id: number;
  rpc: string;
  explorer: string | null;
  explorer_base: string;
};

export type RegimeInfo = {
  regime: number;
  label: string; // "risk-off" | "neutral" | "risk-on"
  vol_z: number;
  trend: number;
  price: number;
  on_chain: number | null;
  synced: boolean;
};
