export const PERSONAS = ["degen", "momentum", "risk-first"] as const;
export type Persona = (typeof PERSONAS)[number];

export const VERDICTS = ["ignore", "watch", "enter"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const SOLANA_PROTOCOLS = [
  "RAYDIUM_AMM",
  "RAYDIUM_CPMM",
  "RAYDIUM_CLMM",
  "RAYDIUM_LAUNCH_LAB",
  "PUMP_FUN",
  "PUMP_FUN_AMM",
  "MOONSHOT",
  "METEORA_DAMM",
  "METEORA_DLMM",
  "METEORA_DBC",
  "ORCA_WHIRLPOOL",
] as const;

export type SolanaProtocol = (typeof SOLANA_PROTOCOLS)[number];

export const REASON_CODES = [
  "DATA_TOO_SPARSE",
  "LIQUIDITY_SURGED",
  "LIQUIDITY_DROPPED",
  "VOLUME_ACCELERATED",
  "VOLUME_STALLED",
  "BREAKOUT_CONFIRMED",
  "BREAKOUT_FAILED",
  "VOLATILITY_TOO_HIGH",
  "MARKET_CAP_EXPANDING",
  "SETUP_INVALIDATED",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export type LaunchSnapshot = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  protocol: string;
  pairAddress: string;
  createdAt: string;
  lastEventAt: string;
  lastPairCandleAt: string | null;
  lastTokenCandleAt: string | null;
  ageMinutes: number;
  liquidityUsd: number;
  marketCapUsd: number;
  quoteRateUsd: number;
  volume1mUsd: number;
  volume5mUsd: number;
  volume15mUsd: number;
  volume1hUsd: number;
  priceChange1mPct: number;
  priceChange5mPct: number;
  priceChange15mPct: number;
  priceChange1hPct: number;
  swapCount5m: number;
  swapCount1h: number;
};

export type ScoredLaunch = LaunchSnapshot & {
  score: number;
  delta1m: number;
  delta5m: number;
  delta15m: number;
  delta1h: number;
  verdict: Verdict;
  personaVerdicts: Record<Persona, Verdict>;
  reasons: ReasonCode[];
};

export type LaunchInsightMemo = {
  bull: string;
  bear: string;
  verdict: string;
};

export type LaunchTimelineEntry = {
  id: string;
  launchId: string;
  title: string;
  summary: string;
  severity: "info" | "warn" | "critical";
  createdAt: string;
};

export type RecommendationOutcome = {
  id: string;
  evaluationWindow: string;
  priceChangePct: number;
  maxUpsidePct: number;
  maxDrawdownPct: number;
  outcomeLabel: string;
  computedAt: string;
};

export type Recommendation = {
  id: string;
  launchId: string;
  persona: Persona;
  verdict: Verdict;
  scoreAtEntry: number;
  priceAtEntryUsd: number;
  liquidityAtEntryUsd: number | null;
  marketCapAtEntryUsd: number | null;
  issuedAt: string;
  evaluationStatus: string;
  evaluatedAt: string | null;
  rationaleSummary: string;
  latestOutcome: RecommendationOutcome | null;
};

export type RecommendationScorecard = {
  totalIssued: number;
  openCount: number;
  settledCount: number;
  validatedCount: number;
  failedCount: number;
  expiredCount: number;
  winRatePct: number;
  recentRecommendations: Recommendation[];
};

export const ALERT_TYPES = [
  "verdict-crossing",
  "paper-trade-opened",
  "paper-trade-settled",
  "setup-invalidated",
  "breakout-failed",
  "liquidity-surge",
  "discovery-graduated",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export type AlertRecord = {
  id: string;
  launchId: string;
  tokenSymbol: string;
  tokenName: string;
  alertType: AlertType;
  title: string;
  body: string;
  severity: "info" | "warn" | "critical";
  createdAt: string;
};

export type AlertDigestBucket = {
  alertType: AlertType;
  count: number;
  severity: "info" | "warn" | "critical";
};

export type AlertDigest = {
  windowMinutes: number;
  totalAlerts: number;
  buckets: AlertDigestBucket[];
  recent: AlertRecord[];
};

export type AgentMemoRecord = {
  id: string;
  launchId: string;
  scoreAtMemo: number;
  verdictAtMemo: Verdict;
  reasonsAtMemo: ReasonCode[];
  headline: string | null;
  bull: string;
  bear: string;
  verdict: string;
  confidence: number;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  generatedAt: string;
};

export type AnalystActivityType =
  | "memo-generated"
  | "alert-fired"
  | "timeline-event"
  | "paper-call-opened"
  | "paper-call-settled";

export type AnalystInboxStatus = "watch" | "entered" | "rejected" | "settled";

export type AnalystActivityRecord = {
  id: string;
  launchId: string;
  tokenSymbol: string;
  tokenName: string;
  type: AnalystActivityType;
  inboxStatus: AnalystInboxStatus;
  title: string;
  summary: string;
  decision: string;
  why: string;
  risk: string;
  nextCheck: string;
  sourceLabel: string;
  severity: "info" | "warn" | "critical";
  score: number | null;
  verdict: Verdict | null;
  modelUsed: string | null;
  createdAt: string;
};

export type AnalystActivitySummary = {
  totalActivities: number;
  memoCount: number;
  alertCount: number;
  paperCallCount: number;
  watchCount: number;
  enteredCount: number;
  rejectedCount: number;
  settledCount: number;
  criticalCount: number;
  latestActivityAt: string | null;
  activities: AnalystActivityRecord[];
};

export type GoldRushTokenMetadata = {
  contract_name?: string | null;
  contract_address?: string | null;
  contract_decimals?: number | null;
  contract_ticker_symbol?: string | null;
};

export type GoldRushTokenSearchResult = {
  pair_address: string;
  chain_name: string;
  quote_rate?: number | null;
  quote_rate_usd?: number | null;
  volume?: number | null;
  volume_usd?: number | null;
  swap_count?: number | string | null;
  market_cap?: number | null;
  base_token?: GoldRushTokenMetadata | null;
  quote_token?: GoldRushTokenMetadata | null;
};

export type GoldRushNewPairEvent = {
  pair?: GoldRushTokenMetadata | null;
  liquidity?: number | null;
  tx_hash?: string | null;
  supply?: number | null;
  pair_address: string;
  dev_holdings?: number | null;
  base_token?: GoldRushTokenMetadata | null;
  protocol: string;
  protocol_version?: string | null;
  market_cap?: number | null;
  quote_rate?: number | null;
  quote_token?: GoldRushTokenMetadata | null;
  quote_rate_usd?: number | null;
  event_name?: string | null;
  block_signed_at: string;
  deployer_address?: string | null;
  chain_name: string;
};

export type GoldRushMetricWindow = {
  current_value?: number | null;
  previous_value?: number | null;
  pct_change?: number | null;
};

export type GoldRushTimeframeMetrics = {
  price?: GoldRushMetricWindow | null;
  swap_count?: GoldRushMetricWindow | null;
  volume_usd?: GoldRushMetricWindow | null;
  buy_count?: GoldRushMetricWindow | null;
  sell_count?: GoldRushMetricWindow | null;
  unique_buyers?: GoldRushMetricWindow | null;
  unique_sellers?: GoldRushMetricWindow | null;
};

export type GoldRushUpdatePairEvent = {
  chain_name: string;
  pair_address: string;
  timestamp: string;
  quote_rate?: number | null;
  quote_rate_usd?: number | null;
  market_cap?: number | null;
  liquidity?: number | null;
  base_token?: GoldRushTokenMetadata | null;
  quote_token?: GoldRushTokenMetadata | null;
  last_5m?: GoldRushTimeframeMetrics | null;
  last_1hr?: GoldRushTimeframeMetrics | null;
  last_6hr?: GoldRushTimeframeMetrics | null;
  last_24hr?: GoldRushTimeframeMetrics | null;
};

export const GOLDRUSH_OHLCV_INTERVALS = [
  "ONE_SECOND",
  "FIVE_SECONDS",
  "FIFTEEN_SECONDS",
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
] as const;

export type GoldRushOhlcvInterval = (typeof GOLDRUSH_OHLCV_INTERVALS)[number];

export const GOLDRUSH_OHLCV_TIMEFRAMES = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "FIVE_DAYS",
  "SEVEN_DAYS",
  "THIRTY_DAYS",
] as const;

export type GoldRushOhlcvTimeframe = (typeof GOLDRUSH_OHLCV_TIMEFRAMES)[number];

export type GoldRushOhlcvPairCandleEvent = {
  id?: string | null;
  chain_name: string;
  pair_address: string;
  interval: GoldRushOhlcvInterval;
  timeframe: GoldRushOhlcvTimeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  volume_usd?: number | null;
  quote_rate?: number | null;
  quote_rate_usd?: number | null;
  base_token?: GoldRushTokenMetadata | null;
  quote_token?: GoldRushTokenMetadata | null;
};

export type GoldRushOhlcvTokenCandleEvent = {
  chain_name: string;
  pair_address?: string | null;
  interval: GoldRushOhlcvInterval;
  timeframe: GoldRushOhlcvTimeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  volume_usd?: number | null;
  quote_rate?: number | null;
  quote_rate_usd?: number | null;
  base_token?: GoldRushTokenMetadata | null;
  quote_token?: GoldRushTokenMetadata | null;
};

export type GoldRushStreamConfig = {
  apiKey: string;
  streamUrl: string;
  chainName: "SOLANA_MAINNET";
  trackedProtocols: readonly SolanaProtocol[];
};
