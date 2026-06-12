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
};
