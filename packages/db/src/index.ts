import type {
  AgentMemoRecord,
  AlertDigest,
  AlertDigestBucket,
  AlertRecord,
  AlertType,
  AnalystActivityRecord,
  AnalystActivitySummary,
  AnalystInboxStatus,
  GoldRushNewPairEvent,
  GoldRushOhlcvPairCandleEvent,
  GoldRushOhlcvTokenCandleEvent,
  GoldRushUpdatePairEvent,
  LaunchSnapshot,
  LaunchTimelineEntry,
  Persona,
  ReasonCode,
  Recommendation,
  RecommendationScorecard,
  ScoredLaunch,
  Verdict,
} from "@jaguar/domain";
import { ALERT_TYPES } from "@jaguar/domain";
import { scoreLaunch, scoreLaunchBoard } from "@jaguar/scoring";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  type Prisma,
  PrismaClient,
  Persona as PrismaPersona,
  type Severity,
} from "../generated/client/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required before Jaguar can read or write launch data.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

const getPrismaClient = () => {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
};

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

const launchWithStateInclude = {
  state: true,
} satisfies Prisma.LaunchInclude;

type LaunchWithState = Prisma.LaunchGetPayload<{
  include: typeof launchWithStateInclude;
}>;

type LaunchWithStateTimelinesAndRecommendations = Prisma.LaunchGetPayload<{
  include: {
    state: true;
    timelines: {
      orderBy: {
        createdAt: "desc";
      };
      take: 25;
    };
    recommendations: {
      orderBy: {
        issuedAt: "desc";
      };
      take: 10;
      include: {
        outcomes: {
          orderBy: {
            computedAt: "desc";
          };
        };
      };
    };
  };
}>;

type RecommendationWithOutcomes = Prisma.RecommendationGetPayload<{
  include: {
    outcomes: {
      orderBy: {
        computedAt: "desc";
      };
    };
  };
}>;

type TransactionClient = Prisma.TransactionClient;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const safeNumber = (value: number | null | undefined) => value ?? 0;

const safeInteger = (value: number | null | undefined) => Math.round(value ?? 0);

const optionalInteger = (value: number | null | undefined) =>
  value == null ? undefined : Math.round(value);

const clampConfidence = (value: number) => Math.min(100, Math.max(0, value));

const safePercentChange = (current: number, previous: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
};

const minutesBetween = (value: Date) =>
  Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000));

const formatUsd = (value: number) => currencyFormatter.format(value);

const verdictRank: Record<Verdict, number> = {
  ignore: 0,
  watch: 1,
  enter: 2,
};

const personaToPrisma: Record<Persona, PrismaPersona> = {
  degen: PrismaPersona.degen,
  momentum: PrismaPersona.momentum,
  "risk-first": PrismaPersona.risk_first,
};

const prismaToPersona: Record<PrismaPersona, Persona> = {
  [PrismaPersona.degen]: "degen",
  [PrismaPersona.momentum]: "momentum",
  [PrismaPersona.risk_first]: "risk-first",
};

const recommendationWindows = [
  { key: "live", minutes: 0 },
  { key: "5m", minutes: 5 },
  { key: "15m", minutes: 15 },
  { key: "1h", minutes: 60 },
] as const;

const ingestionSourceStreams = [
  "newPairs",
  "updatePairs",
  "ohlcvCandlesForPair",
  "ohlcvCandlesForToken",
] as const;

type WorkerHeartbeatInput = {
  workerKey: string;
  chainName: string;
  streamUrl: string;
  startedAt: Date;
  heartbeatAt: Date;
  trackedProtocolCount: number;
  trackedPairCount: number;
  pairCandleCandidateCount: number;
  tokenCandleCandidateCount: number;
};

const getPersonaVerdictFromState = (
  state: LaunchWithState["state"] | null | undefined,
  persona: Persona,
): Verdict => {
  if (!state) return "ignore";

  switch (persona) {
    case "degen":
      return state.verdictDegen;
    case "momentum":
      return state.verdictMomentum;
    case "risk-first":
      return state.verdictRiskFirst;
  }
};

const buildRecommendationSummary = (
  persona: Persona,
  verdict: Verdict,
  scored: ScoredLaunch,
  sourceStream: string,
) =>
  `${persona} ${verdict} call opened from ${sourceStream} at score ${scored.score} with ${formatUsd(scored.liquidityUsd)} liquidity, ${formatUsd(scored.volume5mUsd)} of 5 minute flow, and reasons: ${scored.reasons.join(", ") || "no reasons yet"}.`;

const classifyRecommendationOutcome = ({
  verdict,
  priceChangePct,
  isInvalidated,
  elapsedMinutes,
}: {
  verdict: Verdict;
  priceChangePct: number;
  isInvalidated: boolean;
  elapsedMinutes: number;
}) => {
  const upsideTarget = verdict === "enter" ? 12 : 8;
  const failureThreshold = verdict === "enter" ? -12 : -10;

  if (isInvalidated || priceChangePct <= failureThreshold) {
    return {
      outcomeLabel: "failed",
      evaluationStatus: "failed",
    };
  }

  if (priceChangePct >= upsideTarget) {
    return {
      outcomeLabel: "validated",
      evaluationStatus: "validated",
    };
  }

  if (elapsedMinutes >= 60) {
    return {
      outcomeLabel: priceChangePct > 0 ? "expired-green" : "expired-flat",
      evaluationStatus: "expired",
    };
  }

  return {
    outcomeLabel: "open",
    evaluationStatus: "pending",
  };
};

type PairCandleSummary = {
  lastPairCandleAt: Date | null;
  currentVolume1mUsd: number;
  currentVolume15mUsd: number;
  priceChange1mPct: number;
  priceChange15mPct: number;
  currentQuoteRate: number | null;
  currentQuoteRateUsd: number | null;
};

type TokenCandleSummary = {
  lastTokenCandleAt: Date | null;
  primaryPairAddress: string | null;
  currentVolume1mUsd: number;
  currentVolume15mUsd: number;
  priceChange1mPct: number;
  priceChange15mPct: number;
  currentQuoteRate: number | null;
  currentQuoteRateUsd: number | null;
};

type ResolvedCandleSummary = {
  lastPairCandleAt: Date | null;
  lastTokenCandleAt: Date | null;
  currentVolume1mUsd: number;
  currentVolume15mUsd: number;
  priceChange1mPct: number;
  priceChange15mPct: number;
  currentQuoteRate: number | null;
  currentQuoteRateUsd: number | null;
};

const emptyPairCandleSummary = (): PairCandleSummary => ({
  lastPairCandleAt: null,
  currentVolume1mUsd: 0,
  currentVolume15mUsd: 0,
  priceChange1mPct: 0,
  priceChange15mPct: 0,
  currentQuoteRate: null,
  currentQuoteRateUsd: null,
});

const emptyTokenCandleSummary = (): TokenCandleSummary => ({
  lastTokenCandleAt: null,
  primaryPairAddress: null,
  currentVolume1mUsd: 0,
  currentVolume15mUsd: 0,
  priceChange1mPct: 0,
  priceChange15mPct: 0,
  currentQuoteRate: null,
  currentQuoteRateUsd: null,
});

const summarizePairCandles = (
  candles: Array<{
    timestamp: Date;
    open: number;
    close: number;
    volumeUsd: number | null;
    quoteRate: number | null;
    quoteRateUsd: number | null;
  }>,
): PairCandleSummary => {
  if (candles.length === 0) {
    return emptyPairCandleSummary();
  }

  const orderedCandles = [...candles].sort(
    (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
  );
  const latestCandle = orderedCandles.at(-1);

  if (!latestCandle) {
    return emptyPairCandleSummary();
  }

  const fifteenMinuteWindow = orderedCandles.slice(-15);
  const oldestFifteenMinuteCandle = fifteenMinuteWindow[0] ?? latestCandle;

  return {
    lastPairCandleAt: latestCandle.timestamp,
    currentVolume1mUsd: safeNumber(latestCandle.volumeUsd),
    currentVolume15mUsd: fifteenMinuteWindow.reduce(
      (total, candle) => total + safeNumber(candle.volumeUsd),
      0,
    ),
    priceChange1mPct: safePercentChange(latestCandle.close, latestCandle.open),
    priceChange15mPct: safePercentChange(latestCandle.close, oldestFifteenMinuteCandle.open),
    currentQuoteRate: latestCandle.quoteRate ?? null,
    currentQuoteRateUsd: latestCandle.quoteRateUsd ?? null,
  };
};

const summarizeTokenCandles = (
  candles: Array<{
    timestamp: Date;
    open: number;
    close: number;
    volumeUsd: number | null;
    quoteRate: number | null;
    quoteRateUsd: number | null;
    primaryPairAddress: string | null;
  }>,
): TokenCandleSummary => {
  if (candles.length === 0) {
    return emptyTokenCandleSummary();
  }

  const orderedCandles = [...candles].sort(
    (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
  );
  const latestCandle = orderedCandles.at(-1);

  if (!latestCandle) {
    return emptyTokenCandleSummary();
  }

  const fifteenMinuteWindow = orderedCandles.slice(-15);
  const oldestFifteenMinuteCandle = fifteenMinuteWindow[0] ?? latestCandle;

  return {
    lastTokenCandleAt: latestCandle.timestamp,
    primaryPairAddress: latestCandle.primaryPairAddress,
    currentVolume1mUsd: safeNumber(latestCandle.volumeUsd),
    currentVolume15mUsd: fifteenMinuteWindow.reduce(
      (total, candle) => total + safeNumber(candle.volumeUsd),
      0,
    ),
    priceChange1mPct: safePercentChange(latestCandle.close, latestCandle.open),
    priceChange15mPct: safePercentChange(latestCandle.close, oldestFifteenMinuteCandle.open),
    currentQuoteRate: latestCandle.quoteRate ?? null,
    currentQuoteRateUsd: latestCandle.quoteRateUsd ?? null,
  };
};

const resolveCandleSummary = (
  pairSummary: PairCandleSummary,
  tokenSummary: TokenCandleSummary,
): ResolvedCandleSummary => {
  const usePairSummary = pairSummary.lastPairCandleAt !== null;

  return {
    lastPairCandleAt: pairSummary.lastPairCandleAt,
    lastTokenCandleAt: tokenSummary.lastTokenCandleAt,
    currentVolume1mUsd: usePairSummary
      ? pairSummary.currentVolume1mUsd
      : tokenSummary.currentVolume1mUsd,
    currentVolume15mUsd: usePairSummary
      ? pairSummary.currentVolume15mUsd
      : tokenSummary.currentVolume15mUsd,
    priceChange1mPct: usePairSummary ? pairSummary.priceChange1mPct : tokenSummary.priceChange1mPct,
    priceChange15mPct: usePairSummary
      ? pairSummary.priceChange15mPct
      : tokenSummary.priceChange15mPct,
    currentQuoteRate: usePairSummary ? pairSummary.currentQuoteRate : tokenSummary.currentQuoteRate,
    currentQuoteRateUsd: usePairSummary
      ? pairSummary.currentQuoteRateUsd
      : tokenSummary.currentQuoteRateUsd,
  };
};

const toSnapshot = (launch: LaunchWithState): LaunchSnapshot => ({
  id: launch.id,
  tokenSymbol: launch.baseTokenSymbol,
  tokenName: launch.baseTokenName ?? launch.baseTokenSymbol,
  protocol: launch.protocol,
  pairAddress: launch.pairAddress,
  createdAt: launch.firstSeenAt.toISOString(),
  lastEventAt: (launch.state?.lastEventAt ?? launch.lastSeenAt ?? launch.firstSeenAt).toISOString(),
  lastPairCandleAt: launch.state?.lastPairCandleAt?.toISOString() ?? null,
  lastTokenCandleAt: launch.state?.lastTokenCandleAt?.toISOString() ?? null,
  ageMinutes: minutesBetween(launch.firstSeenAt),
  liquidityUsd: safeNumber(launch.state?.currentLiquidityUsd),
  marketCapUsd: safeNumber(launch.state?.currentMarketCapUsd),
  quoteRateUsd: safeNumber(launch.state?.currentQuoteRateUsd),
  volume1mUsd: safeNumber(launch.state?.currentVolume1mUsd),
  volume5mUsd: safeNumber(launch.state?.currentVolume5mUsd),
  volume15mUsd: safeNumber(launch.state?.currentVolume15mUsd),
  volume1hUsd: safeNumber(launch.state?.currentVolume1hUsd),
  priceChange1mPct: safeNumber(launch.state?.priceChange1mPct),
  priceChange5mPct: safeNumber(launch.state?.priceChange5mPct),
  priceChange15mPct: safeNumber(launch.state?.priceChange15mPct),
  priceChange1hPct: safeNumber(launch.state?.priceChange1hPct),
  swapCount5m: safeInteger(launch.state?.currentSwapCount5m),
  swapCount1h: safeInteger(launch.state?.currentSwapCount1h),
});

const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const toRecommendation = (recommendation: RecommendationWithOutcomes): Recommendation => {
  const latestOutcome = recommendation.outcomes[0];
  const rationale = recommendation.rationaleJson
    ? (() => {
        try {
          const parsed = JSON.parse(recommendation.rationaleJson);
          return typeof parsed?.summary === "string" ? parsed.summary : "";
        } catch {
          return "";
        }
      })()
    : "";

  return {
    id: recommendation.id,
    launchId: recommendation.launchId,
    persona: prismaToPersona[recommendation.persona],
    verdict: recommendation.verdict,
    scoreAtEntry: recommendation.scoreAtEntry,
    priceAtEntryUsd: recommendation.priceAtEntry,
    liquidityAtEntryUsd: recommendation.liquidityAtEntry,
    marketCapAtEntryUsd: recommendation.marketCapAtEntry,
    issuedAt: recommendation.issuedAt.toISOString(),
    evaluationStatus: recommendation.evaluationStatus,
    evaluatedAt: recommendation.evaluatedAt?.toISOString() ?? null,
    rationaleSummary: rationale,
    latestOutcome: latestOutcome
      ? {
          id: latestOutcome.id,
          evaluationWindow: latestOutcome.evaluationWindow,
          priceChangePct: latestOutcome.priceChangePct,
          maxUpsidePct: latestOutcome.maxUpsidePct,
          maxDrawdownPct: latestOutcome.maxDrawdownPct,
          outcomeLabel: latestOutcome.outcomeLabel,
          computedAt: latestOutcome.computedAt.toISOString(),
        }
      : null,
  };
};

const joinSummaryParts = (parts: string[]) => {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
};

const buildDiscoveryEvidenceParts = (scored: ScoredLaunch) => {
  const parts: string[] = [];

  if (scored.liquidityUsd > 0) {
    parts.push(`${formatUsd(scored.liquidityUsd)} liquidity`);
  }

  if (scored.volume1mUsd > 0) {
    parts.push(`${formatUsd(scored.volume1mUsd)} of 1 minute flow`);
  } else if (scored.volume5mUsd > 0) {
    parts.push(`${formatUsd(scored.volume5mUsd)} of 5 minute flow`);
  } else if (scored.volume15mUsd > 0) {
    parts.push(`${formatUsd(scored.volume15mUsd)} of 15 minute flow`);
  } else if (scored.volume1hUsd > 0) {
    parts.push(`${formatUsd(scored.volume1hUsd)} of 1 hour flow`);
  }

  if (scored.swapCount5m > 0) {
    parts.push(`${safeInteger(scored.swapCount5m)} swaps in 5 minutes`);
  } else if (scored.swapCount1h > 0) {
    parts.push(`${safeInteger(scored.swapCount1h)} swaps in 1 hour`);
  }

  if (scored.marketCapUsd > 0) {
    parts.push(`${formatUsd(scored.marketCapUsd)} market cap`);
  }

  if (scored.quoteRateUsd > 0) {
    parts.push("live quote pricing");
  }

  if (scored.priceChange1mPct !== 0) {
    parts.push(
      `${scored.priceChange1mPct >= 0 ? "+" : ""}${scored.priceChange1mPct.toFixed(1)}% price change in 1 minute`,
    );
  } else if (scored.priceChange5mPct !== 0) {
    parts.push(
      `${scored.priceChange5mPct >= 0 ? "+" : ""}${scored.priceChange5mPct.toFixed(1)}% price change in 5 minutes`,
    );
  } else if (scored.priceChange15mPct !== 0) {
    parts.push(
      `${scored.priceChange15mPct >= 0 ? "+" : ""}${scored.priceChange15mPct.toFixed(1)}% price change in 15 minutes`,
    );
  } else if (scored.priceChange1hPct !== 0) {
    parts.push(
      `${scored.priceChange1hPct >= 0 ? "+" : ""}${scored.priceChange1hPct.toFixed(1)}% price change in 1 hour`,
    );
  }

  return parts;
};

const buildTimelineEntries = ({
  launchId,
  previous,
  scored,
  eventTime,
}: {
  launchId: string;
  previous: LaunchWithState["state"];
  scored: ScoredLaunch;
  eventTime: Date;
}) => {
  const entries: Array<{
    launchId: string;
    timeBucket: string;
    title: string;
    summary: string;
    severity: Severity;
    detailsJson: string;
    createdAt: Date;
  }> = [];

  const previousReasons = new Set(parseJsonArray(previous?.reasonCodesJson));
  const verdictChanged = previous && previous.verdictGlobal !== scored.verdict;
  const scoreShift =
    typeof previous?.scoreGlobal === "number" ? scored.score - previous.scoreGlobal : 0;
  const discoveryGraduated =
    previousReasons.has("DATA_TOO_SPARSE") && !scored.reasons.includes("DATA_TOO_SPARSE");
  const discoveryEvidenceParts = buildDiscoveryEvidenceParts(scored);

  if (!previous) {
    entries.push({
      launchId,
      timeBucket: "initial",
      title: "Live tracking started",
      summary: `Jaguar started live tracking with ${formatUsd(scored.liquidityUsd)} liquidity and ${formatUsd(scored.marketCapUsd)} market cap.`,
      severity: "info",
      detailsJson: JSON.stringify({ verdict: scored.verdict, score: scored.score }),
      createdAt: eventTime,
    });
  }

  if (discoveryGraduated) {
    entries.push({
      launchId,
      timeBucket: "discovery-graduated",
      title: "Graduated from discovery",
      summary: `GoldRush is now surfacing ${joinSummaryParts(discoveryEvidenceParts) || "enough live execution and pricing data"} for Jaguar to score this pair beyond discovery-only. The live score is now ${scored.score} with a ${scored.verdict} verdict.`,
      severity: scored.verdict === "ignore" ? "info" : "warn",
      detailsJson: JSON.stringify({
        score: scored.score,
        verdict: scored.verdict,
        evidence: discoveryEvidenceParts,
        liquidityUsd: scored.liquidityUsd,
        volume5mUsd: scored.volume5mUsd,
        volume1hUsd: scored.volume1hUsd,
        swapCount5m: scored.swapCount5m,
        swapCount1h: scored.swapCount1h,
        marketCapUsd: scored.marketCapUsd,
        quoteRateUsd: scored.quoteRateUsd,
      }),
      createdAt: eventTime,
    });
  }

  if (previous && Math.abs(scoreShift) >= 8) {
    entries.push({
      launchId,
      timeBucket: "conviction-delta",
      title: scoreShift > 0 ? "Conviction accelerated" : "Conviction cooled",
      summary: `Jaguar's score moved from ${previous.scoreGlobal} to ${scored.score}. The live tape now shows ${scored.delta1m >= 0 ? "+" : ""}${scored.delta1m}% over 1 minute, ${scored.delta5m >= 0 ? "+" : ""}${scored.delta5m}% over 5 minutes, and ${scored.delta15m >= 0 ? "+" : ""}${scored.delta15m}% over 15 minutes.`,
      severity: scoreShift > 0 ? "warn" : scored.verdict === "ignore" ? "critical" : "info",
      detailsJson: JSON.stringify({
        previousScore: previous.scoreGlobal,
        currentScore: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        volume1mUsd: scored.volume1mUsd,
        volume5mUsd: scored.volume5mUsd,
        volume15mUsd: scored.volume15mUsd,
      }),
      createdAt: eventTime,
    });
  }

  if (verdictChanged) {
    entries.push({
      launchId,
      timeBucket: "verdict-change",
      title: `${scored.verdict.toUpperCase()} threshold crossed`,
      summary: `The live score moved to ${scored.score}, shifting Jaguar from ${previous?.verdictGlobal ?? "ignore"} to ${scored.verdict}.`,
      severity: scored.verdict === "enter" ? "warn" : "info",
      detailsJson: JSON.stringify({
        previousVerdict: previous?.verdictGlobal ?? "ignore",
        currentVerdict: scored.verdict,
        score: scored.score,
      }),
      createdAt: eventTime,
    });
  }

  if (!previousReasons.has("VOLUME_ACCELERATED") && scored.reasons.includes("VOLUME_ACCELERATED")) {
    entries.push({
      launchId,
      timeBucket: "flow-accelerated",
      title: "Flow accelerated",
      summary: `Recent trading flow pushed to ${formatUsd(scored.volume1mUsd)} over 1 minute, ${formatUsd(scored.volume5mUsd)} over 5 minutes, and ${formatUsd(scored.volume15mUsd)} over 15 minutes.`,
      severity: "warn",
      detailsJson: JSON.stringify({
        volume1mUsd: scored.volume1mUsd,
        volume5mUsd: scored.volume5mUsd,
        volume15mUsd: scored.volume15mUsd,
        swapCount5m: scored.swapCount5m,
      }),
      createdAt: eventTime,
    });
  }

  if (!previousReasons.has("LIQUIDITY_SURGED") && scored.reasons.includes("LIQUIDITY_SURGED")) {
    entries.push({
      launchId,
      timeBucket: "liquidity-threshold",
      title: "Liquidity strength threshold cleared",
      summary: `Live liquidity crossed into stronger territory at ${formatUsd(scored.liquidityUsd)}.`,
      severity: "warn",
      detailsJson: JSON.stringify({ liquidityUsd: scored.liquidityUsd }),
      createdAt: eventTime,
    });
  }

  if (!previousReasons.has("BREAKOUT_CONFIRMED") && scored.reasons.includes("BREAKOUT_CONFIRMED")) {
    entries.push({
      launchId,
      timeBucket: "breakout-confirmed",
      title: "Breakout confirmed",
      summary: `Price moved ${scored.priceChange1mPct >= 0 ? "+" : ""}${scored.priceChange1mPct.toFixed(1)}% in 1 minute and ${scored.priceChange15mPct >= 0 ? "+" : ""}${scored.priceChange15mPct.toFixed(1)}% in 15 minutes while Jaguar kept the launch above the breakout line.`,
      severity: "warn",
      detailsJson: JSON.stringify({
        priceChange1mPct: scored.priceChange1mPct,
        priceChange5mPct: scored.priceChange5mPct,
        priceChange15mPct: scored.priceChange15mPct,
        priceChange1hPct: scored.priceChange1hPct,
      }),
      createdAt: eventTime,
    });
  }

  if (!previousReasons.has("BREAKOUT_FAILED") && scored.reasons.includes("BREAKOUT_FAILED")) {
    entries.push({
      launchId,
      timeBucket: "breakout-failed",
      title: "Breakout failed",
      summary: `Short-window price action rolled over to ${scored.priceChange1mPct.toFixed(1)}% in 1 minute and ${scored.priceChange15mPct.toFixed(1)}% in 15 minutes, weakening the launch's follow-through case.`,
      severity: "critical",
      detailsJson: JSON.stringify({
        priceChange1mPct: scored.priceChange1mPct,
        priceChange5mPct: scored.priceChange5mPct,
        priceChange15mPct: scored.priceChange15mPct,
        priceChange1hPct: scored.priceChange1hPct,
      }),
      createdAt: eventTime,
    });
  }

  if (!previousReasons.has("VOLUME_STALLED") && scored.reasons.includes("VOLUME_STALLED")) {
    entries.push({
      launchId,
      timeBucket: "flow-stalled",
      title: "Flow stalled",
      summary: `Live flow slipped to ${formatUsd(scored.volume1mUsd)} over 1 minute and ${formatUsd(scored.volume15mUsd)} over 15 minutes, leaving the pair without enough activity to strengthen conviction.`,
      severity: "info",
      detailsJson: JSON.stringify({
        volume1mUsd: scored.volume1mUsd,
        volume5mUsd: scored.volume5mUsd,
        volume15mUsd: scored.volume15mUsd,
        volume1hUsd: scored.volume1hUsd,
      }),
      createdAt: eventTime,
    });
  }

  if (!previousReasons.has("SETUP_INVALIDATED") && scored.reasons.includes("SETUP_INVALIDATED")) {
    entries.push({
      launchId,
      timeBucket: "setup-invalidated",
      title: "Setup invalidated",
      summary:
        "Short-window price action moved far enough against the launch for Jaguar to flag the setup as invalidated.",
      severity: "critical",
      detailsJson: JSON.stringify({
        priceChange5mPct: scored.priceChange5mPct,
        priceChange1hPct: scored.priceChange1hPct,
      }),
      createdAt: eventTime,
    });
  }

  return entries;
};

const syncRecommendations = async ({
  tx,
  launchId,
  scored,
  previousState,
  eventTime,
  sourceStream,
}: {
  tx: TransactionClient;
  launchId: string;
  scored: ScoredLaunch;
  previousState: LaunchWithState["state"] | null;
  eventTime: Date;
  sourceStream: "newPairs" | "updatePairs" | "ohlcvCandlesForPair" | "ohlcvCandlesForToken";
}) => {
  const timelineEntries: Array<{
    launchId: string;
    timeBucket: string;
    title: string;
    summary: string;
    severity: Severity;
    detailsJson: string;
    createdAt: Date;
  }> = [];

  if (scored.quoteRateUsd > 0) {
    for (const persona of ["degen", "momentum", "risk-first"] as const) {
      const currentVerdict = scored.personaVerdicts[persona];
      const previousVerdict = getPersonaVerdictFromState(previousState, persona);

      if (
        verdictRank[currentVerdict] <= verdictRank[previousVerdict] ||
        verdictRank[currentVerdict] === 0
      ) {
        continue;
      }

      const existingPending = await tx.recommendation.findFirst({
        where: {
          launchId,
          persona: personaToPrisma[persona],
          verdict: currentVerdict,
          evaluationStatus: "pending",
        },
        orderBy: {
          issuedAt: "desc",
        },
      });

      if (existingPending) {
        continue;
      }

      await tx.recommendation.create({
        data: {
          launchId,
          persona: personaToPrisma[persona],
          verdict: currentVerdict,
          scoreAtEntry: scored.score,
          priceAtEntry: scored.quoteRateUsd,
          liquidityAtEntry: scored.liquidityUsd,
          marketCapAtEntry: scored.marketCapUsd,
          rationaleJson: JSON.stringify({
            sourceStream,
            summary: buildRecommendationSummary(persona, currentVerdict, scored, sourceStream),
            reasons: scored.reasons,
            delta1m: scored.delta1m,
            delta5m: scored.delta5m,
            delta15m: scored.delta15m,
            delta1h: scored.delta1h,
            score: scored.score,
          }),
          issuedAt: eventTime,
        },
      });

      timelineEntries.push({
        launchId,
        timeBucket: "recommendation-opened",
        title: `${persona} ${currentVerdict.toUpperCase()} call opened`,
        summary: `Jaguar opened a ${currentVerdict} paper trade for ${persona} at ${formatUsd(scored.quoteRateUsd)} with score ${scored.score}.`,
        severity: currentVerdict === "enter" ? "warn" : "info",
        detailsJson: JSON.stringify({
          persona,
          verdict: currentVerdict,
          score: scored.score,
          priceAtEntry: scored.quoteRateUsd,
        }),
        createdAt: eventTime,
      });
    }
  }

  if (scored.quoteRateUsd <= 0) {
    return timelineEntries;
  }

  const pendingRecommendations = await tx.recommendation.findMany({
    where: {
      launchId,
      evaluationStatus: "pending",
    },
    include: {
      outcomes: {
        orderBy: {
          computedAt: "desc",
        },
      },
    },
  });

  const isInvalidated = scored.reasons.includes("SETUP_INVALIDATED");

  for (const recommendation of pendingRecommendations) {
    const priceChangePct =
      ((scored.quoteRateUsd - recommendation.priceAtEntry) / recommendation.priceAtEntry) * 100;
    const elapsedMinutes = Math.max(
      0,
      Math.round((eventTime.getTime() - recommendation.issuedAt.getTime()) / 60_000),
    );
    const liveOutcome = recommendation.outcomes.find(
      (outcome) => outcome.evaluationWindow === "live",
    );
    const previousMaxUpside = liveOutcome?.maxUpsidePct ?? Number.NEGATIVE_INFINITY;
    const previousMaxDrawdown = liveOutcome?.maxDrawdownPct ?? Number.POSITIVE_INFINITY;
    const maxUpsidePct = Math.max(previousMaxUpside, priceChangePct, 0);
    const maxDrawdownPct = Math.min(previousMaxDrawdown, priceChangePct, 0);
    const classification = classifyRecommendationOutcome({
      verdict: recommendation.verdict,
      priceChangePct,
      isInvalidated,
      elapsedMinutes,
    });

    await tx.recommendationOutcome.upsert({
      where: {
        recommendationId_evaluationWindow: {
          recommendationId: recommendation.id,
          evaluationWindow: "live",
        },
      },
      update: {
        priceChangePct,
        maxUpsidePct,
        maxDrawdownPct,
        outcomeLabel: classification.outcomeLabel,
        computedAt: eventTime,
      },
      create: {
        recommendationId: recommendation.id,
        evaluationWindow: "live",
        priceChangePct,
        maxUpsidePct,
        maxDrawdownPct,
        outcomeLabel: classification.outcomeLabel,
        computedAt: eventTime,
      },
    });

    for (const window of recommendationWindows.filter((item) => item.key !== "live")) {
      if (elapsedMinutes < window.minutes) {
        continue;
      }

      await tx.recommendationOutcome.upsert({
        where: {
          recommendationId_evaluationWindow: {
            recommendationId: recommendation.id,
            evaluationWindow: window.key,
          },
        },
        update: {
          priceChangePct,
          maxUpsidePct,
          maxDrawdownPct,
          outcomeLabel: classification.outcomeLabel,
          computedAt: eventTime,
        },
        create: {
          recommendationId: recommendation.id,
          evaluationWindow: window.key,
          priceChangePct,
          maxUpsidePct,
          maxDrawdownPct,
          outcomeLabel: classification.outcomeLabel,
          computedAt: eventTime,
        },
      });
    }

    if (classification.evaluationStatus !== "pending") {
      await tx.recommendation.update({
        where: {
          id: recommendation.id,
        },
        data: {
          evaluationStatus: classification.evaluationStatus,
          evaluatedAt: eventTime,
        },
      });

      timelineEntries.push({
        launchId,
        timeBucket: "recommendation-settled",
        title: `${prismaToPersona[recommendation.persona]} call ${classification.evaluationStatus}`,
        summary: `Jaguar's ${recommendation.verdict} paper trade moved ${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(1)}% from entry and is now marked ${classification.evaluationStatus}.`,
        severity: classification.evaluationStatus === "validated" ? "warn" : "critical",
        detailsJson: JSON.stringify({
          recommendationId: recommendation.id,
          persona: prismaToPersona[recommendation.persona],
          verdict: recommendation.verdict,
          priceChangePct,
          evaluationStatus: classification.evaluationStatus,
        }),
        createdAt: eventTime,
      });
    }
  }

  return timelineEntries;
};

type TransitionTimelineEntry = {
  launchId: string;
  timeBucket: string;
  title: string;
  summary: string;
  severity: Severity;
  detailsJson: string;
  createdAt: Date;
};

export type AnalystTrigger =
  | "discovery-graduated"
  | "verdict-watch"
  | "verdict-enter"
  | "score-drift"
  | "setup-invalidated"
  | "flow-accelerated"
  | "liquidity-surge"
  | "paper-trade-opened";

export type IngestionApplyResult = {
  launchId: string;
  pairAddress: string;
  score: number;
  verdict: Verdict;
  duplicate: boolean;
  analystTriggers: AnalystTrigger[];
};

const timelineEntriesToAnalystTriggers = (entries: TransitionTimelineEntry[]): AnalystTrigger[] => {
  const triggers = new Set<AnalystTrigger>();

  for (const entry of entries) {
    switch (entry.timeBucket) {
      case "discovery-graduated":
        triggers.add("discovery-graduated");
        break;
      case "verdict-change":
        try {
          const parsed = JSON.parse(entry.detailsJson) as { currentVerdict?: Verdict };
          if (parsed.currentVerdict === "watch") triggers.add("verdict-watch");
          if (parsed.currentVerdict === "enter") triggers.add("verdict-enter");
        } catch {
          // Ignore malformed historical details; timeline rendering still owns display.
        }
        break;
      case "conviction-delta":
        triggers.add("score-drift");
        break;
      case "setup-invalidated":
        triggers.add("setup-invalidated");
        break;
      case "flow-accelerated":
        triggers.add("flow-accelerated");
        break;
      case "liquidity-threshold":
        triggers.add("liquidity-surge");
        break;
      case "recommendation-opened":
        triggers.add("paper-trade-opened");
        break;
    }
  }

  return [...triggers];
};

// Compression rule: same (launchId, alertType) cannot fire again within this window.
// Transitions are only emitted on actual state change, so this is belt-and-suspenders
// against redundant firings from back-to-back events that cross the same threshold.
const ALERT_COOLDOWN_MINUTES = 5;
const ALERT_COOLDOWN_MS = ALERT_COOLDOWN_MINUTES * 60_000;

const severityRank: Record<Severity, number> = {
  info: 0,
  warn: 1,
  critical: 2,
};

const escalateSeverity = (a: Severity, b: Severity): Severity =>
  severityRank[a] >= severityRank[b] ? a : b;

const timelineBucketToAlertType = (timeBucket: string): AlertType | null => {
  switch (timeBucket) {
    case "verdict-change":
      return "verdict-crossing";
    case "recommendation-opened":
      return "paper-trade-opened";
    case "recommendation-settled":
      return "paper-trade-settled";
    case "setup-invalidated":
      return "setup-invalidated";
    case "breakout-failed":
      return "breakout-failed";
    case "liquidity-threshold":
      return "liquidity-surge";
    case "discovery-graduated":
      return "discovery-graduated";
    default:
      return null;
  }
};

const isActionableTransition = (entry: TransitionTimelineEntry, alertType: AlertType): boolean => {
  // A verdict crossing into ignore is a cool-down, not an actionable alert.
  if (alertType === "verdict-crossing") {
    try {
      const parsed = JSON.parse(entry.detailsJson) as { currentVerdict?: string };
      if (parsed.currentVerdict === "ignore") return false;
    } catch {
      return false;
    }
  }
  return true;
};

const recordAlertsForTransitions = async ({
  tx,
  entries,
  scored,
}: {
  tx: TransactionClient;
  entries: TransitionTimelineEntry[];
  scored: ScoredLaunch;
}) => {
  // Suppress alerts for launches Jaguar cannot yet score with conviction.
  // The home-page discovery lane already hides these; the alert layer follows suit
  // so discovery churn never shows up in a digest.
  if (scored.reasons.includes("DATA_TOO_SPARSE")) {
    return;
  }

  type AlertInsert = {
    launchId: string;
    alertType: string;
    title: string;
    body: string;
    severity: Severity;
    payloadJson: string | null;
    createdAt: Date;
  };

  const cooldownCutoff = new Date(Date.now() - ALERT_COOLDOWN_MS);
  const toInsert: AlertInsert[] = [];

  for (const entry of entries) {
    const alertType = timelineBucketToAlertType(entry.timeBucket);
    if (!alertType) continue;
    if (!isActionableTransition(entry, alertType)) continue;

    const existing = await tx.alert.findFirst({
      where: {
        launchId: entry.launchId,
        alertType,
        createdAt: { gte: cooldownCutoff },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) continue;

    toInsert.push({
      launchId: entry.launchId,
      alertType,
      title: entry.title,
      body: entry.summary,
      severity: entry.severity,
      payloadJson: entry.detailsJson,
      createdAt: entry.createdAt,
    });
  }

  if (toInsert.length > 0) {
    await tx.alert.createMany({ data: toInsert });
  }
};

const loadPairCandleSummary = async (tx: TransactionClient, launchId: string) => {
  const recentCandles = await tx.launchPairCandle.findMany({
    where: {
      launchId,
      interval: "ONE_MINUTE",
      timeframe: "ONE_HOUR",
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 15,
    select: {
      timestamp: true,
      open: true,
      close: true,
      volumeUsd: true,
      quoteRate: true,
      quoteRateUsd: true,
    },
  });

  return summarizePairCandles(recentCandles);
};

const loadTokenCandleSummary = async (tx: TransactionClient, launchId: string) => {
  const recentCandles = await tx.launchTokenCandle.findMany({
    where: {
      launchId,
      interval: "ONE_MINUTE",
      timeframe: "ONE_HOUR",
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 15,
    select: {
      timestamp: true,
      open: true,
      close: true,
      volumeUsd: true,
      quoteRate: true,
      quoteRateUsd: true,
      primaryPairAddress: true,
    },
  });

  return summarizeTokenCandles(recentCandles);
};

const verdictValue = (verdict: Verdict) => verdict;

export const listTrackedPairAddresses = async (limit = 50) => {
  const launches = await prisma.launch.findMany({
    where: {
      currentStatus: {
        not: "archived",
      },
    },
    orderBy: [{ lastSeenAt: "desc" }, { firstSeenAt: "desc" }],
    take: limit,
    select: {
      pairAddress: true,
    },
  });

  return launches.map((launch) => launch.pairAddress);
};

export const listOhlcvCandidatePairAddresses = async (limit = 12) => {
  const launches = await prisma.launch.findMany({
    where: {
      currentStatus: {
        not: "archived",
      },
      state: {
        isNot: null,
      },
    },
    include: launchWithStateInclude,
    take: Math.max(limit * 4, limit),
    orderBy: [{ lastSeenAt: "desc" }, { firstSeenAt: "desc" }],
  });

  return launches
    .map((launch) => {
      const state = launch.state;

      if (!state) {
        return {
          pairAddress: launch.pairAddress,
          priority: -1,
          lastEventAt: 0,
        };
      }

      const recencyMinutes = Math.max(0, (Date.now() - state.lastEventAt.getTime()) / 60_000);
      const recencyScore = Math.max(0, 120 - recencyMinutes) / 120;
      const signalScore =
        (state.currentQuoteRateUsd && state.currentQuoteRateUsd > 0 ? 5 : 0) +
        (state.currentLiquidityUsd && state.currentLiquidityUsd > 0 ? 5 : 0) +
        (state.currentVolume5mUsd && state.currentVolume5mUsd > 0 ? 8 : 0) +
        (state.currentVolume1hUsd && state.currentVolume1hUsd > 0 ? 4 : 0) +
        (state.currentSwapCount5m && state.currentSwapCount5m > 0 ? 4 : 0) +
        (state.currentSwapCount1h && state.currentSwapCount1h > 0 ? 2 : 0) +
        state.scoreGlobal;

      return {
        pairAddress: launch.pairAddress,
        priority: signalScore + recencyScore,
        lastEventAt: state.lastEventAt.getTime(),
      };
    })
    .filter((launch) => launch.priority > 0)
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return right.lastEventAt - left.lastEventAt;
    })
    .slice(0, limit)
    .map((launch) => launch.pairAddress);
};

export const listOhlcvCandidateTokenAddresses = async (limit = 12) => {
  const launches = await prisma.launch.findMany({
    where: {
      currentStatus: {
        not: "archived",
      },
      state: {
        isNot: null,
      },
    },
    include: launchWithStateInclude,
    take: Math.max(limit * 4, limit),
    orderBy: [{ lastSeenAt: "desc" }, { firstSeenAt: "desc" }],
  });

  const bestByTokenAddress = new Map<
    string,
    { tokenAddress: string; priority: number; lastEventAt: number }
  >();

  for (const launch of launches) {
    const tokenAddress = launch.baseTokenAddress;
    const state = launch.state;

    if (!state || !tokenAddress || tokenAddress === "UNKNOWN") {
      continue;
    }

    const recencyMinutes = Math.max(0, (Date.now() - state.lastEventAt.getTime()) / 60_000);
    const recencyScore = Math.max(0, 1_440 - recencyMinutes) / 1_440;
    const signalScore =
      (state.currentQuoteRateUsd && state.currentQuoteRateUsd > 0 ? 6 : 0) +
      (state.currentLiquidityUsd && state.currentLiquidityUsd > 0 ? 6 : 0) +
      (state.currentVolume5mUsd && state.currentVolume5mUsd > 0 ? 8 : 0) +
      (state.currentVolume1hUsd && state.currentVolume1hUsd > 0 ? 4 : 0) +
      (state.currentSwapCount5m && state.currentSwapCount5m > 0 ? 4 : 0) +
      state.scoreGlobal;
    const priority = signalScore + recencyScore;
    const currentBest = bestByTokenAddress.get(tokenAddress);

    if (!currentBest || priority > currentBest.priority) {
      bestByTokenAddress.set(tokenAddress, {
        tokenAddress,
        priority,
        lastEventAt: state.lastEventAt.getTime(),
      });
    }
  }

  return [...bestByTokenAddress.values()]
    .filter((launch) => launch.priority > 0)
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return right.lastEventAt - left.lastEventAt;
    })
    .slice(0, limit)
    .map((launch) => launch.tokenAddress);
};

export const listLaunchBoard = async (limit = 25, persona: Persona = "momentum") => {
  const launches = await prisma.launch.findMany({
    include: launchWithStateInclude,
    orderBy: [{ firstSeenAt: "desc" }],
    take: Math.max(limit * 2, limit),
  });

  return scoreLaunchBoard(launches.map(toSnapshot), persona).slice(0, limit);
};

export const getMissionControlSummary = async () => {
  const lastFiveMinutes = new Date(Date.now() - 5 * 60_000);

  const [trackedLaunches, rawEvents, activeLaunches, flowConfirmedLaunches, latestState] =
    await Promise.all([
      prisma.launch.count({
        where: {
          currentStatus: {
            not: "archived",
          },
        },
      }),
      prisma.launchEvent.count(),
      prisma.launchState.count({
        where: {
          lastEventAt: {
            gte: lastFiveMinutes,
          },
        },
      }),
      prisma.launchState.count({
        where: {
          OR: [
            {
              currentVolume1mUsd: {
                gt: 0,
              },
            },
            {
              currentLiquidityUsd: {
                gt: 0,
              },
            },
            {
              currentVolume5mUsd: {
                gt: 0,
              },
            },
            {
              currentVolume15mUsd: {
                gt: 0,
              },
            },
            {
              currentVolume1hUsd: {
                gt: 0,
              },
            },
            {
              currentSwapCount5m: {
                gt: 0,
              },
            },
            {
              currentSwapCount1h: {
                gt: 0,
              },
            },
          ],
        },
      }),
      prisma.launchState.findFirst({
        orderBy: {
          lastEventAt: "desc",
        },
        select: {
          lastEventAt: true,
        },
      }),
    ]);

  return {
    trackedLaunches,
    rawEvents,
    activeLaunches,
    flowConfirmedLaunches,
    lastEventAt: latestState?.lastEventAt.toISOString() ?? null,
  };
};

export const getTopbarNotificationSummary = async (windowMinutes = 60) => {
  const since = new Date(Date.now() - windowMinutes * 60_000);

  const analystTimelineBuckets = [
    "discovery-graduated",
    "conviction-delta",
    "verdict-change",
    "setup-invalidated",
    "flow-accelerated",
    "liquidity-threshold",
    "breakout-failed",
    "recommendation-opened",
    "recommendation-settled",
  ];

  const [
    newLaunchCount,
    latestLaunch,
    memoCount,
    alertCount,
    timelineCount,
    recommendationCount,
    latestMemo,
    latestAlert,
    latestTimeline,
    latestRecommendation,
  ] = await Promise.all([
    prisma.launch.count({
      where: {
        currentStatus: {
          not: "archived",
        },
        firstSeenAt: {
          gte: since,
        },
      },
    }),
    prisma.launch.findFirst({
      where: {
        currentStatus: {
          not: "archived",
        },
        firstSeenAt: {
          gte: since,
        },
      },
      orderBy: { firstSeenAt: "desc" },
      select: { firstSeenAt: true },
    }),
    prisma.launchMemo.count({
      where: {
        generatedAt: {
          gte: since,
        },
      },
    }),
    prisma.alert.count({
      where: {
        createdAt: {
          gte: since,
        },
      },
    }),
    prisma.launchTimeline.count({
      where: {
        timeBucket: {
          in: analystTimelineBuckets,
        },
        createdAt: {
          gte: since,
        },
      },
    }),
    prisma.recommendation.count({
      where: {
        OR: [
          {
            issuedAt: {
              gte: since,
            },
          },
          {
            evaluatedAt: {
              gte: since,
            },
          },
        ],
      },
    }),
    prisma.launchMemo.findFirst({
      where: {
        generatedAt: {
          gte: since,
        },
      },
      orderBy: { generatedAt: "desc" },
      select: { generatedAt: true },
    }),
    prisma.alert.findFirst({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.launchTimeline.findFirst({
      where: {
        timeBucket: {
          in: analystTimelineBuckets,
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.recommendation.findFirst({
      where: {
        OR: [
          {
            issuedAt: {
              gte: since,
            },
          },
          {
            evaluatedAt: {
              gte: since,
            },
          },
        ],
      },
      orderBy: [{ evaluatedAt: "desc" }, { issuedAt: "desc" }],
      select: { issuedAt: true, evaluatedAt: true },
    }),
  ]);

  const analystLatestTimes = [
    latestMemo?.generatedAt,
    latestAlert?.createdAt,
    latestTimeline?.createdAt,
    latestRecommendation?.evaluatedAt ?? latestRecommendation?.issuedAt,
  ].filter((value): value is Date => Boolean(value));

  const latestAnalystAt =
    analystLatestTimes.length > 0
      ? new Date(Math.max(...analystLatestTimes.map((date) => date.getTime()))).toISOString()
      : null;

  return {
    windowMinutes,
    launches: {
      count: newLaunchCount,
      latestAt: latestLaunch?.firstSeenAt.toISOString() ?? null,
    },
    analyst: {
      count: memoCount + alertCount + timelineCount + recommendationCount,
      latestAt: latestAnalystAt,
    },
  };
};

export const upsertWorkerHeartbeat = async (input: WorkerHeartbeatInput) => {
  await prisma.workerHeartbeat.upsert({
    where: {
      workerKey: input.workerKey,
    },
    update: {
      chainName: input.chainName,
      streamUrl: input.streamUrl,
      startedAt: input.startedAt,
      heartbeatAt: input.heartbeatAt,
      trackedProtocolCount: input.trackedProtocolCount,
      trackedPairCount: input.trackedPairCount,
      pairCandleCandidateCount: input.pairCandleCandidateCount,
      tokenCandleCandidateCount: input.tokenCandleCandidateCount,
    },
    create: {
      workerKey: input.workerKey,
      chainName: input.chainName,
      streamUrl: input.streamUrl,
      startedAt: input.startedAt,
      heartbeatAt: input.heartbeatAt,
      trackedProtocolCount: input.trackedProtocolCount,
      trackedPairCount: input.trackedPairCount,
      pairCandleCandidateCount: input.pairCandleCandidateCount,
      tokenCandleCandidateCount: input.tokenCandleCandidateCount,
    },
  });
};

export const getWorkerHealth = async () => {
  const latest = await prisma.workerHeartbeat.findFirst({
    orderBy: { heartbeatAt: "desc" },
  });

  if (!latest) return null;

  return {
    workerKey: latest.workerKey,
    chainName: latest.chainName,
    startedAt: latest.startedAt.toISOString(),
    heartbeatAt: latest.heartbeatAt.toISOString(),
    trackedPairCount: latest.trackedPairCount,
    pairCandleCandidateCount: latest.pairCandleCandidateCount,
    tokenCandleCandidateCount: latest.tokenCandleCandidateCount,
  };
};

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

// Bucket the last 7 calendar days of recommendation activity. Returns one entry
// per day, oldest first, with the count of calls Jaguar issued that day. The
// "peak" day is marked so the chart component can render a label.
export const getConvictionWeekBuckets = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(startOfToday);
  weekStart.setDate(weekStart.getDate() - 6);

  const recommendations = await prisma.recommendation.findMany({
    where: { issuedAt: { gte: weekStart } },
    select: { issuedAt: true },
  });

  const counts = new Array<number>(7).fill(0);
  for (const rec of recommendations) {
    const d = new Date(rec.issuedAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((dayStart.getTime() - weekStart.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < 7) counts[diffDays] = (counts[diffDays] ?? 0) + 1;
  }

  const peak = Math.max(...counts);
  // Normalize to a minimum visible height so empty days still show the track.
  const minHeight = 12;

  return counts.map((count, idx) => {
    const dayIndex = (weekStart.getDay() + idx) % 7;
    const day = WEEKDAY_LETTERS[dayIndex] ?? "·";
    const ratio = peak > 0 ? count / peak : 0;
    const height = Math.round(minHeight + ratio * (100 - minHeight));
    const isPeak = peak > 0 && count === peak;
    return {
      day,
      height,
      count,
      tone: count === 0 ? ("flat" as const) : isPeak ? ("peak" as const) : ("on" as const),
      peakLabel: isPeak ? `${count}` : null,
    };
  });
};

export const getIngestionDiagnostics = async () => {
  const [
    trackedPairAddresses,
    pairCandleCandidateAddresses,
    tokenCandleCandidateAddresses,
    pairCandleRows,
    tokenCandleRows,
    statesWithPairCandle,
    statesWithTokenCandle,
    statesUsingTokenFallback,
    groupedStreamEvents,
    latestWorkerHeartbeat,
  ] = await Promise.all([
    listTrackedPairAddresses(50),
    listOhlcvCandidatePairAddresses(12),
    listOhlcvCandidateTokenAddresses(24),
    prisma.launchPairCandle.count(),
    prisma.launchTokenCandle.count(),
    prisma.launchState.count({
      where: {
        lastPairCandleAt: {
          not: null,
        },
      },
    }),
    prisma.launchState.count({
      where: {
        lastTokenCandleAt: {
          not: null,
        },
      },
    }),
    prisma.launchState.count({
      where: {
        lastPairCandleAt: null,
        lastTokenCandleAt: {
          not: null,
        },
      },
    }),
    prisma.launchEvent.groupBy({
      by: ["sourceStream"],
      where: {
        sourceStream: {
          in: [...ingestionSourceStreams],
        },
      },
      _count: {
        _all: true,
      },
      _max: {
        eventTime: true,
      },
    }),
    prisma.workerHeartbeat.findFirst({
      orderBy: {
        heartbeatAt: "desc",
      },
    }),
  ]);

  const groupedBySource = new Map(
    groupedStreamEvents.map((event) => [event.sourceStream, event] as const),
  );

  return {
    trackedPairCount: trackedPairAddresses.length,
    pairCandleCandidateCount: pairCandleCandidateAddresses.length,
    tokenCandleCandidateCount: tokenCandleCandidateAddresses.length,
    pairCandleRows,
    tokenCandleRows,
    statesWithPairCandle,
    statesWithTokenCandle,
    statesUsingTokenFallback,
    workerHeartbeat: latestWorkerHeartbeat
      ? {
          workerKey: latestWorkerHeartbeat.workerKey,
          chainName: latestWorkerHeartbeat.chainName,
          streamUrl: latestWorkerHeartbeat.streamUrl,
          startedAt: latestWorkerHeartbeat.startedAt.toISOString(),
          heartbeatAt: latestWorkerHeartbeat.heartbeatAt.toISOString(),
          trackedProtocolCount: latestWorkerHeartbeat.trackedProtocolCount,
          trackedPairCount: latestWorkerHeartbeat.trackedPairCount,
          pairCandleCandidateCount: latestWorkerHeartbeat.pairCandleCandidateCount,
          tokenCandleCandidateCount: latestWorkerHeartbeat.tokenCandleCandidateCount,
        }
      : null,
    streams: ingestionSourceStreams.map((sourceStream) => {
      const grouped = groupedBySource.get(sourceStream);

      return {
        sourceStream,
        eventCount: grouped?._count._all ?? 0,
        lastEventAt: grouped?._max.eventTime?.toISOString() ?? null,
      };
    }),
  };
};

export const recomputeAllLaunchStates = async () => {
  const launches = await prisma.launch.findMany({
    include: launchWithStateInclude,
  });

  let updated = 0;

  for (const launch of launches) {
    if (!launch.state) {
      continue;
    }

    const scored = scoreLaunch(toSnapshot(launch));

    await prisma.launchState.update({
      where: {
        launchId: launch.id,
      },
      data: {
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
    });

    updated += 1;
  }

  return {
    updated,
  };
};

export const getRecommendationScorecard = async (
  recentLimit = 6,
  persona?: Persona,
): Promise<RecommendationScorecard> => {
  const where = persona
    ? {
        persona: personaToPrisma[persona],
      }
    : undefined;
  const [totalIssued, openCount, validatedCount, failedCount, expiredCount, recentRecommendations] =
    await Promise.all([
      prisma.recommendation.count({ where }),
      prisma.recommendation.count({
        where: {
          ...where,
          evaluationStatus: "pending",
        },
      }),
      prisma.recommendation.count({
        where: {
          ...where,
          evaluationStatus: "validated",
        },
      }),
      prisma.recommendation.count({
        where: {
          ...where,
          evaluationStatus: "failed",
        },
      }),
      prisma.recommendation.count({
        where: {
          ...where,
          evaluationStatus: "expired",
        },
      }),
      prisma.recommendation.findMany({
        where,
        orderBy: {
          issuedAt: "desc",
        },
        take: recentLimit,
        include: {
          outcomes: {
            orderBy: {
              computedAt: "desc",
            },
          },
        },
      }),
    ]);

  const settledCount = validatedCount + failedCount + expiredCount;
  const winRatePct = settledCount > 0 ? (validatedCount / settledCount) * 100 : 0;

  return {
    totalIssued,
    openCount,
    settledCount,
    validatedCount,
    failedCount,
    expiredCount,
    winRatePct,
    recentRecommendations: recentRecommendations.map(toRecommendation),
  };
};

const toAlertRecord = (alert: {
  id: string;
  launchId: string;
  alertType: string;
  title: string;
  body: string;
  severity: Severity;
  createdAt: Date;
  launch: { baseTokenSymbol: string; baseTokenName: string | null };
}): AlertRecord | null => {
  if (!ALERT_TYPES.includes(alert.alertType as AlertType)) return null;
  return {
    id: alert.id,
    launchId: alert.launchId,
    tokenSymbol: alert.launch.baseTokenSymbol,
    tokenName: alert.launch.baseTokenName ?? alert.launch.baseTokenSymbol,
    alertType: alert.alertType as AlertType,
    title: alert.title,
    body: alert.body,
    severity: alert.severity,
    createdAt: alert.createdAt.toISOString(),
  };
};

export const getAlertDigest = async (options?: {
  windowMinutes?: number;
  recentLimit?: number;
}): Promise<AlertDigest> => {
  const windowMinutes = options?.windowMinutes ?? 30;
  const recentLimit = options?.recentLimit ?? 6;
  const cutoff = new Date(Date.now() - windowMinutes * 60_000);

  const alerts = await prisma.alert.findMany({
    where: { createdAt: { gte: cutoff } },
    include: {
      launch: {
        select: { baseTokenSymbol: true, baseTokenName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const records = alerts
    .map((alert) => toAlertRecord(alert))
    .filter((record): record is AlertRecord => record !== null);

  const bucketsByType = new Map<AlertType, AlertDigestBucket>();
  for (const record of records) {
    const existing = bucketsByType.get(record.alertType);
    if (!existing) {
      bucketsByType.set(record.alertType, {
        alertType: record.alertType,
        count: 1,
        severity: record.severity,
      });
    } else {
      existing.count += 1;
      existing.severity = escalateSeverity(existing.severity, record.severity);
    }
  }

  return {
    windowMinutes,
    totalAlerts: records.length,
    buckets: Array.from(bucketsByType.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return severityRank[b.severity] - severityRank[a.severity];
    }),
    recent: records.slice(0, recentLimit),
  };
};

const toActivityLaunchLabel = (launch: {
  baseTokenSymbol: string;
  baseTokenName: string | null;
}) => ({
  tokenSymbol: launch.baseTokenSymbol,
  tokenName: launch.baseTokenName ?? launch.baseTokenSymbol,
});

const toSeverityFromStatus = (status: string): "info" | "warn" | "critical" => {
  if (status === "failed") return "critical";
  if (status === "validated") return "warn";
  return "info";
};

const toInboxStatusFromVerdict = (verdict: Verdict): AnalystInboxStatus => {
  if (verdict === "enter") return "entered";
  if (verdict === "watch") return "watch";
  return "rejected";
};

const nextCheckForVerdict = (verdict: Verdict, score: number | null): string => {
  if (verdict === "enter") {
    return "Track follow-through; downgrade if score loses the entry band or a stored invalidation fires.";
  }

  if (verdict === "watch") {
    const scoreText = typeof score === "number" ? `Current score is ${score}. ` : "";
    return `${scoreText}Wait for fresh GoldRush market data to confirm liquidity, flow, and score above 60.`;
  }

  return "Keep out of the active set until stored metrics recover above Jaguar's watch threshold.";
};

const riskForVerdict = (verdict: Verdict): string => {
  if (verdict === "enter")
    return "Entry can fail if flow cools, liquidity disappears, or price action invalidates.";
  if (verdict === "watch")
    return "The setup is not confirmed yet; acting before entry threshold adds execution risk.";
  return "Below Jaguar's action threshold, so this should not be treated as a live trade.";
};

const parseRationaleSummary = (value: string | null): string => {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return typeof parsed?.summary === "string" ? sanitizeAnalystCopy(parsed.summary) : "";
  } catch {
    return "";
  }
};

const sanitizeAnalystCopy = (value: string): string =>
  value
    .replaceAll("ohlcvCandlesForPair", "pair candle data")
    .replaceAll("ohlcvCandlesForToken", "token candle data")
    .replaceAll("updatePairs", "live pair updates")
    .replaceAll("newPairs", "new-pair discovery")
    .replaceAll("score > 60", "score above 60")
    .replaceAll("score < 30", "score below 30");

const sentenceCase = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

const decisionLabel = (verdict: Verdict, tokenSymbol: string): string =>
  `${sentenceCase(verdict)} ${tokenSymbol}`;

const recommendationDecisionLabel = (
  persona: Persona,
  verdict: Verdict,
  tokenSymbol: string,
  settled: boolean,
  status: string,
): string => {
  const personaLabel = sentenceCase(persona.replace("-", " "));
  if (settled) return `${personaLabel} call ${status} on ${tokenSymbol}`;
  return `${personaLabel} ${verdict} call on ${tokenSymbol}`;
};

const recommendationStatus = (status: string, verdict: Verdict): AnalystInboxStatus => {
  if (status === "pending") return toInboxStatusFromVerdict(verdict);
  return "settled";
};

const activitySourceLabels: Record<string, string> = {
  "verdict-crossing": "threshold",
  "paper-trade-opened": "paper call",
  "paper-trade-settled": "settlement",
  "setup-invalidated": "invalidation",
  "breakout-failed": "failed breakout",
  "liquidity-surge": "liquidity",
  "discovery-graduated": "graduation",
  "conviction-delta": "score drift",
  "verdict-change": "threshold",
  "flow-accelerated": "flow",
  "liquidity-threshold": "liquidity",
};

const formatActivitySource = (source: string): string =>
  activitySourceLabels[source] ?? source.replaceAll("-", " ");

const timelineStatus = (
  timeBucket: string,
  severity: "info" | "warn" | "critical",
  verdict: Verdict | null,
): AnalystInboxStatus => {
  if (timeBucket === "setup-invalidated" || timeBucket === "breakout-failed") return "rejected";
  if (severity === "critical") return "rejected";
  if (verdict) return toInboxStatusFromVerdict(verdict);
  return severity === "warn" ? "watch" : "rejected";
};

export const getAnalystActivity = async (limit = 30): Promise<AnalystActivitySummary> => {
  const [memos, alerts, timelines, recommendations, latestMemoCount] = await Promise.all([
    prisma.launchMemo.findMany({
      orderBy: { generatedAt: "desc" },
      take: limit,
      include: {
        launch: {
          select: { baseTokenSymbol: true, baseTokenName: true },
        },
      },
    }),
    prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        launch: {
          select: { baseTokenSymbol: true, baseTokenName: true, state: true },
        },
      },
    }),
    prisma.launchTimeline.findMany({
      where: {
        timeBucket: {
          in: [
            "discovery-graduated",
            "conviction-delta",
            "verdict-change",
            "setup-invalidated",
            "flow-accelerated",
            "liquidity-threshold",
            "breakout-failed",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        launch: {
          select: { baseTokenSymbol: true, baseTokenName: true, state: true },
        },
      },
    }),
    prisma.recommendation.findMany({
      orderBy: { issuedAt: "desc" },
      take: limit,
      include: {
        launch: {
          select: { baseTokenSymbol: true, baseTokenName: true },
        },
      },
    }),
    prisma.launchMemo.count(),
  ]);

  const activities: AnalystActivityRecord[] = [
    ...memos.map((memo): AnalystActivityRecord => {
      const label = toActivityLaunchLabel(memo.launch);
      const inboxStatus = toInboxStatusFromVerdict(memo.verdictAtMemo);
      return {
        id: `memo-${memo.id}`,
        launchId: memo.launchId,
        ...label,
        type: "memo-generated",
        inboxStatus,
        title: `${memo.verdictAtMemo.toUpperCase()} memo for ${label.tokenSymbol}`,
        summary: memo.verdict,
        decision: decisionLabel(memo.verdictAtMemo, label.tokenSymbol),
        why: sanitizeAnalystCopy(memo.bull),
        risk: sanitizeAnalystCopy(memo.bear),
        nextCheck: nextCheckForVerdict(memo.verdictAtMemo, memo.scoreAtMemo),
        sourceLabel: "autonomous memo",
        severity: memo.verdictAtMemo === "enter" ? "warn" : "info",
        score: memo.scoreAtMemo,
        verdict: memo.verdictAtMemo,
        modelUsed: memo.modelUsed,
        createdAt: memo.generatedAt.toISOString(),
      };
    }),
    ...alerts.map((alert): AnalystActivityRecord => {
      const label = toActivityLaunchLabel(alert.launch);
      const verdict = alert.launch.state?.verdictGlobal ?? null;
      const inboxStatus =
        alert.severity === "critical"
          ? "rejected"
          : verdict
            ? toInboxStatusFromVerdict(verdict)
            : "watch";
      return {
        id: `alert-${alert.id}`,
        launchId: alert.launchId,
        ...label,
        type: "alert-fired",
        inboxStatus,
        title: alert.title,
        summary: alert.body,
        decision: `${alert.title} on ${label.tokenSymbol}`,
        why: sanitizeAnalystCopy(alert.body),
        risk: verdict
          ? riskForVerdict(verdict)
          : "Treat this as a threshold signal until the next stored score confirms direction.",
        nextCheck: verdict
          ? nextCheckForVerdict(verdict, alert.launch.state?.scoreGlobal ?? null)
          : "Check the next stored GoldRush update for confirmation.",
        sourceLabel: formatActivitySource(alert.alertType),
        severity: alert.severity,
        score: alert.launch.state?.scoreGlobal ?? null,
        verdict,
        modelUsed: null,
        createdAt: alert.createdAt.toISOString(),
      };
    }),
    ...timelines.map((entry): AnalystActivityRecord => {
      const label = toActivityLaunchLabel(entry.launch);
      const verdict = entry.launch.state?.verdictGlobal ?? null;
      const inboxStatus = timelineStatus(entry.timeBucket, entry.severity, verdict);
      return {
        id: `timeline-${entry.id}`,
        launchId: entry.launchId,
        ...label,
        type: "timeline-event",
        inboxStatus,
        title: entry.title,
        summary: entry.summary,
        decision: `${entry.title}: ${label.tokenSymbol}`,
        why: sanitizeAnalystCopy(entry.summary),
        risk: verdict
          ? riskForVerdict(verdict)
          : "No current verdict is attached to this transition yet.",
        nextCheck: verdict
          ? nextCheckForVerdict(verdict, entry.launch.state?.scoreGlobal ?? null)
          : "Wait for the next stored scoring transition.",
        sourceLabel: formatActivitySource(entry.timeBucket),
        severity: entry.severity,
        score: entry.launch.state?.scoreGlobal ?? null,
        verdict,
        modelUsed: null,
        createdAt: entry.createdAt.toISOString(),
      };
    }),
    ...recommendations.map((recommendation): AnalystActivityRecord => {
      const label = toActivityLaunchLabel(recommendation.launch);
      const settled = recommendation.evaluationStatus !== "pending";
      const inboxStatus = recommendationStatus(
        recommendation.evaluationStatus,
        recommendation.verdict,
      );
      const rationale = parseRationaleSummary(recommendation.rationaleJson);
      return {
        id: `recommendation-${recommendation.id}`,
        launchId: recommendation.launchId,
        ...label,
        type: settled ? "paper-call-settled" : "paper-call-opened",
        inboxStatus,
        title: `${prismaToPersona[recommendation.persona]} ${recommendation.verdict.toUpperCase()} call ${
          settled ? recommendation.evaluationStatus : "opened"
        }`,
        summary: `Score ${recommendation.scoreAtEntry} at entry, price ${recommendation.priceAtEntry.toFixed(8)}.`,
        decision: recommendationDecisionLabel(
          prismaToPersona[recommendation.persona],
          recommendation.verdict,
          label.tokenSymbol,
          settled,
          recommendation.evaluationStatus,
        ),
        why:
          rationale ||
          `${sentenceCase(prismaToPersona[recommendation.persona].replace("-", " "))} opened from stored score ${recommendation.scoreAtEntry}.`,
        risk: settled
          ? `Call settled as ${recommendation.evaluationStatus}.`
          : riskForVerdict(recommendation.verdict),
        nextCheck: settled
          ? "Review scorecard impact and compare against newer Jaguar calls."
          : nextCheckForVerdict(recommendation.verdict, recommendation.scoreAtEntry),
        sourceLabel: prismaToPersona[recommendation.persona],
        severity: settled ? toSeverityFromStatus(recommendation.evaluationStatus) : "info",
        score: recommendation.scoreAtEntry,
        verdict: recommendation.verdict,
        modelUsed: null,
        createdAt: (recommendation.evaluatedAt ?? recommendation.issuedAt).toISOString(),
      };
    }),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);

  return {
    totalActivities: activities.length,
    memoCount: latestMemoCount,
    alertCount: alerts.length,
    paperCallCount: recommendations.length,
    watchCount: activities.filter((activity) => activity.inboxStatus === "watch").length,
    enteredCount: activities.filter((activity) => activity.inboxStatus === "entered").length,
    rejectedCount: activities.filter((activity) => activity.inboxStatus === "rejected").length,
    settledCount: activities.filter((activity) => activity.inboxStatus === "settled").length,
    criticalCount: activities.filter((activity) => activity.severity === "critical").length,
    latestActivityAt: activities[0]?.createdAt ?? null,
    activities,
  };
};

const verdictToPrisma: Record<Verdict, "ignore" | "watch" | "enter"> = {
  ignore: "ignore",
  watch: "watch",
  enter: "enter",
};

const toAgentMemoRecord = (memo: {
  id: string;
  launchId: string;
  scoreAtMemo: number;
  verdictAtMemo: "ignore" | "watch" | "enter";
  reasonsJson: string;
  headline: string | null;
  bull: string;
  bear: string;
  verdict: string;
  confidence: number;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  generatedAt: Date;
}): AgentMemoRecord => ({
  id: memo.id,
  launchId: memo.launchId,
  scoreAtMemo: memo.scoreAtMemo,
  verdictAtMemo: memo.verdictAtMemo,
  reasonsAtMemo: parseJsonArray(memo.reasonsJson) as ReasonCode[],
  headline: memo.headline ?? null,
  bull: memo.bull,
  bear: memo.bear,
  verdict: memo.verdict,
  confidence: memo.confidence,
  modelUsed: memo.modelUsed,
  inputTokens: memo.inputTokens,
  outputTokens: memo.outputTokens,
  cacheReadTokens: memo.cacheReadTokens,
  generatedAt: memo.generatedAt.toISOString(),
});

export const saveAgentMemo = async (input: {
  launchId: string;
  scoreAtMemo: number;
  verdictAtMemo: Verdict;
  reasonsAtMemo: ReasonCode[];
  headline?: string | null;
  bull: string;
  bear: string;
  verdict: string;
  confidence: number;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}): Promise<AgentMemoRecord> => {
  const memo = await prisma.launchMemo.create({
    data: {
      launchId: input.launchId,
      scoreAtMemo: input.scoreAtMemo,
      verdictAtMemo: verdictToPrisma[input.verdictAtMemo],
      reasonsJson: JSON.stringify(input.reasonsAtMemo),
      headline: input.headline ?? null,
      bull: input.bull,
      bear: input.bear,
      verdict: input.verdict,
      confidence: clampConfidence(input.confidence),
      modelUsed: input.modelUsed,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cacheReadTokens: input.cacheReadTokens,
    },
  });

  return toAgentMemoRecord(memo);
};

export const getLatestAgentMemo = async (launchId: string): Promise<AgentMemoRecord | null> => {
  const memo = await prisma.launchMemo.findFirst({
    where: { launchId },
    orderBy: { generatedAt: "desc" },
  });

  return memo ? toAgentMemoRecord(memo) : null;
};

export type LaunchSearchResult = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  pairAddress: string;
  baseTokenAddress: string;
  quoteTokenSymbol: string;
  protocol: string;
  score: number;
  verdict: Verdict;
  lastEventAt: string;
};

export const searchLaunches = async (query: string, limit = 8): Promise<LaunchSearchResult[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const launches = await prisma.launch.findMany({
    where: {
      OR: [
        { baseTokenSymbol: { contains: trimmedQuery } },
        { baseTokenName: { contains: trimmedQuery } },
        { pairName: { contains: trimmedQuery } },
        { pairAddress: { contains: trimmedQuery } },
        { baseTokenAddress: { contains: trimmedQuery } },
        { quoteTokenAddress: { contains: trimmedQuery } },
      ],
    },
    include: launchWithStateInclude,
    orderBy: [{ firstSeenAt: "desc" }],
    take: Math.max(limit * 3, limit),
  });

  return launches
    .map((launch) => {
      const scored = scoreLaunch(toSnapshot(launch));

      return {
        id: launch.id,
        tokenSymbol: launch.baseTokenSymbol,
        tokenName: launch.baseTokenName ?? launch.baseTokenSymbol,
        pairAddress: launch.pairAddress,
        baseTokenAddress: launch.baseTokenAddress,
        quoteTokenSymbol: launch.quoteTokenSymbol,
        protocol: launch.protocol,
        score: scored.score,
        verdict: scored.verdict,
        lastEventAt: scored.lastEventAt,
      } satisfies LaunchSearchResult;
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.lastEventAt).getTime() - new Date(left.lastEventAt).getTime();
    })
    .slice(0, limit);
};

export const getLaunchDetail = async (
  id: string,
): Promise<{
  launch: ScoredLaunch;
  timeline: LaunchTimelineEntry[];
  recommendations: Recommendation[];
  metadata: {
    chainName: string;
    pairName: string;
    pairAddress: string;
    txHash: string | null;
    deployerAddress: string | null;
    quoteTokenSymbol: string;
    firstSeenAt: string;
    lastSeenAt: string;
    lastEventAt: string;
    currentStatus: string;
    trackingTier: string;
  };
} | null> => {
  const launch = (await prisma.launch.findUnique({
    where: { id },
    include: {
      state: true,
      timelines: {
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
      },
      recommendations: {
        orderBy: {
          issuedAt: "desc",
        },
        take: 10,
        include: {
          outcomes: {
            orderBy: {
              computedAt: "desc",
            },
          },
        },
      },
    },
  })) as LaunchWithStateTimelinesAndRecommendations | null;

  if (!launch) return null;

  const scored = scoreLaunch(toSnapshot(launch));
  const timeline = launch.timelines.map((entry) => ({
    id: entry.id,
    launchId: entry.launchId,
    title: entry.title,
    summary: entry.summary,
    severity: entry.severity,
    createdAt: entry.createdAt.toISOString(),
  }));

  return {
    launch: scored,
    timeline,
    recommendations: launch.recommendations.map(toRecommendation),
    metadata: {
      chainName: launch.chainName,
      pairName: launch.pairName ?? `${launch.baseTokenSymbol}-${launch.quoteTokenSymbol} Pool`,
      pairAddress: launch.pairAddress,
      txHash: launch.txHash,
      deployerAddress: launch.deployerAddress,
      quoteTokenSymbol: launch.quoteTokenSymbol,
      firstSeenAt: launch.firstSeenAt.toISOString(),
      lastSeenAt: (launch.lastSeenAt ?? launch.firstSeenAt).toISOString(),
      lastEventAt: (
        launch.state?.lastEventAt ??
        launch.lastSeenAt ??
        launch.firstSeenAt
      ).toISOString(),
      currentStatus: launch.currentStatus,
      trackingTier: launch.trackingTier,
    },
  };
};

export const upsertLaunchFromNewPair = async (event: GoldRushNewPairEvent) => {
  const eventTime = new Date(event.block_signed_at);

  return prisma.$transaction(async (tx) => {
    const previous = await tx.launch.findUnique({
      where: { pairAddress: event.pair_address },
      include: launchWithStateInclude,
    });

    const launch = await tx.launch.upsert({
      where: { pairAddress: event.pair_address },
      update: {
        chainName: event.chain_name,
        protocol: event.protocol,
        protocolVersion: event.protocol_version ?? null,
        txHash: event.tx_hash ?? null,
        eventName: event.event_name ?? null,
        deployerAddress: event.deployer_address ?? null,
        pairName: event.pair?.contract_name ?? previous?.pairName ?? null,
        baseTokenAddress:
          event.base_token?.contract_address ?? previous?.baseTokenAddress ?? event.pair_address,
        baseTokenName: event.base_token?.contract_name ?? previous?.baseTokenName ?? null,
        baseTokenSymbol:
          event.base_token?.contract_ticker_symbol ?? previous?.baseTokenSymbol ?? "UNKNOWN",
        quoteTokenAddress:
          event.quote_token?.contract_address ?? previous?.quoteTokenAddress ?? "UNKNOWN",
        quoteTokenName: event.quote_token?.contract_name ?? previous?.quoteTokenName ?? null,
        quoteTokenSymbol:
          event.quote_token?.contract_ticker_symbol ?? previous?.quoteTokenSymbol ?? "UNKNOWN",
        supply: event.supply ?? previous?.supply ?? null,
        devHoldings: event.dev_holdings ?? previous?.devHoldings ?? null,
        lastSeenAt: eventTime,
        currentStatus: "tracked",
        trackingTier: "warm",
      },
      create: {
        chainName: event.chain_name,
        protocol: event.protocol,
        protocolVersion: event.protocol_version ?? null,
        txHash: event.tx_hash ?? null,
        eventName: event.event_name ?? null,
        deployerAddress: event.deployer_address ?? null,
        pairAddress: event.pair_address,
        pairName: event.pair?.contract_name ?? null,
        baseTokenAddress: event.base_token?.contract_address ?? event.pair_address,
        baseTokenName: event.base_token?.contract_name ?? null,
        baseTokenSymbol: event.base_token?.contract_ticker_symbol ?? "UNKNOWN",
        quoteTokenAddress: event.quote_token?.contract_address ?? "UNKNOWN",
        quoteTokenName: event.quote_token?.contract_name ?? null,
        quoteTokenSymbol: event.quote_token?.contract_ticker_symbol ?? "UNKNOWN",
        supply: event.supply ?? null,
        devHoldings: event.dev_holdings ?? null,
        firstSeenAt: eventTime,
        lastSeenAt: eventTime,
        currentStatus: "tracked",
        trackingTier: "warm",
      },
      include: launchWithStateInclude,
    });

    const duplicateEvent = await tx.launchEvent.findFirst({
      where: {
        launchId: launch.id,
        eventType: "pair_created",
        eventTime,
      },
    });

    if (duplicateEvent) {
      const currentScore = scoreLaunch(toSnapshot(launch));

      return {
        launchId: launch.id,
        pairAddress: launch.pairAddress,
        score: currentScore.score,
        verdict: currentScore.verdict,
        duplicate: true,
        analystTriggers: [],
      };
    }

    const snapshot = toSnapshot({
      ...launch,
      state: {
        ...launch.state,
        launchId: launch.id,
        lastEventAt: eventTime,
        lastPairCandleAt: launch.state?.lastPairCandleAt ?? null,
        lastTokenCandleAt: launch.state?.lastTokenCandleAt ?? null,
        currentQuoteRate: event.quote_rate ?? launch.state?.currentQuoteRate ?? null,
        currentQuoteRateUsd: event.quote_rate_usd ?? launch.state?.currentQuoteRateUsd ?? null,
        currentLiquidityUsd: event.liquidity ?? launch.state?.currentLiquidityUsd ?? null,
        currentMarketCapUsd: event.market_cap ?? launch.state?.currentMarketCapUsd ?? null,
        currentVolume1mUsd: launch.state?.currentVolume1mUsd ?? 0,
        currentVolume5mUsd: launch.state?.currentVolume5mUsd ?? 0,
        currentVolume15mUsd: launch.state?.currentVolume15mUsd ?? 0,
        currentVolume1hUsd: launch.state?.currentVolume1hUsd ?? 0,
        priceChange1mPct: launch.state?.priceChange1mPct ?? 0,
        currentSwapCount5m: launch.state?.currentSwapCount5m ?? 0,
        currentSwapCount1h: launch.state?.currentSwapCount1h ?? 0,
        priceChange5mPct: launch.state?.priceChange5mPct ?? 0,
        priceChange15mPct: launch.state?.priceChange15mPct ?? 0,
        priceChange1hPct: launch.state?.priceChange1hPct ?? 0,
        scoreGlobal: launch.state?.scoreGlobal ?? 0,
        delta1m: launch.state?.delta1m ?? 0,
        delta5m: launch.state?.delta5m ?? 0,
        delta15m: launch.state?.delta15m ?? 0,
        delta1h: launch.state?.delta1h ?? 0,
        verdictGlobal: launch.state?.verdictGlobal ?? "ignore",
        verdictMomentum: launch.state?.verdictMomentum ?? "ignore",
        verdictDegen: launch.state?.verdictDegen ?? "ignore",
        verdictRiskFirst: launch.state?.verdictRiskFirst ?? "ignore",
        reasonCodesJson: launch.state?.reasonCodesJson ?? null,
        invalidatorsJson: launch.state?.invalidatorsJson ?? null,
        updatedAt: launch.state?.updatedAt ?? eventTime,
      },
    });

    const scored = scoreLaunch(snapshot);

    await tx.launchState.upsert({
      where: { launchId: launch.id },
      update: {
        lastEventAt: eventTime,
        lastPairCandleAt: launch.state?.lastPairCandleAt ?? undefined,
        lastTokenCandleAt: launch.state?.lastTokenCandleAt ?? undefined,
        currentQuoteRate: event.quote_rate ?? undefined,
        currentQuoteRateUsd: event.quote_rate_usd ?? undefined,
        currentLiquidityUsd: event.liquidity ?? undefined,
        currentMarketCapUsd: event.market_cap ?? undefined,
        currentVolume1mUsd: launch.state?.currentVolume1mUsd ?? undefined,
        currentVolume15mUsd: launch.state?.currentVolume15mUsd ?? undefined,
        priceChange1mPct: launch.state?.priceChange1mPct ?? undefined,
        priceChange15mPct: launch.state?.priceChange15mPct ?? undefined,
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
      create: {
        launchId: launch.id,
        lastEventAt: eventTime,
        lastPairCandleAt: null,
        lastTokenCandleAt: null,
        currentQuoteRate: event.quote_rate ?? null,
        currentQuoteRateUsd: event.quote_rate_usd ?? null,
        currentLiquidityUsd: event.liquidity ?? null,
        currentMarketCapUsd: event.market_cap ?? null,
        currentVolume1mUsd: 0,
        currentVolume5mUsd: 0,
        currentVolume15mUsd: 0,
        currentVolume1hUsd: 0,
        priceChange1mPct: 0,
        currentSwapCount5m: 0,
        currentSwapCount1h: 0,
        priceChange5mPct: 0,
        priceChange15mPct: 0,
        priceChange1hPct: 0,
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
    });

    await tx.launchEvent.create({
      data: {
        launchId: launch.id,
        eventType: "pair_created",
        eventTime,
        sourceStream: "newPairs",
        payloadJson: JSON.stringify(event),
      },
    });

    if (!previous) {
      await tx.launchTimeline.create({
        data: {
          launchId: launch.id,
          timeBucket: "initial",
          title: "Pair discovered",
          summary: `GoldRush detected a new ${launch.protocol} pair with ${formatUsd(scored.liquidityUsd)} liquidity and ${formatUsd(scored.marketCapUsd)} market cap.`,
          severity: "info",
          detailsJson: JSON.stringify({
            pairAddress: launch.pairAddress,
            txHash: launch.txHash,
          }),
          createdAt: eventTime,
        },
      });
    }

    const recommendationTimelineEntries = await syncRecommendations({
      tx,
      launchId: launch.id,
      scored,
      previousState: previous?.state ?? null,
      eventTime,
      sourceStream: "newPairs",
    });

    if (recommendationTimelineEntries.length > 0) {
      await tx.launchTimeline.createMany({
        data: recommendationTimelineEntries,
      });
    }

    await recordAlertsForTransitions({
      tx,
      entries: recommendationTimelineEntries,
      scored,
    });

    return {
      launchId: launch.id,
      pairAddress: launch.pairAddress,
      score: scored.score,
      verdict: scored.verdict,
      duplicate: false,
      analystTriggers: timelineEntriesToAnalystTriggers(recommendationTimelineEntries),
    };
  });
};

export const applyLaunchUpdate = async (event: GoldRushUpdatePairEvent) => {
  const eventTime = new Date(event.timestamp);
  const payloadJson = JSON.stringify(event);

  return prisma.$transaction(async (tx) => {
    const previous = await tx.launch.findUnique({
      where: { pairAddress: event.pair_address },
      include: launchWithStateInclude,
    });

    const launch = await tx.launch.upsert({
      where: { pairAddress: event.pair_address },
      update: {
        chainName: event.chain_name,
        protocol: previous?.protocol ?? "UNKNOWN",
        baseTokenAddress:
          event.base_token?.contract_address ?? previous?.baseTokenAddress ?? event.pair_address,
        baseTokenName: event.base_token?.contract_name ?? previous?.baseTokenName ?? null,
        baseTokenSymbol:
          event.base_token?.contract_ticker_symbol ?? previous?.baseTokenSymbol ?? "UNKNOWN",
        quoteTokenAddress:
          event.quote_token?.contract_address ?? previous?.quoteTokenAddress ?? "UNKNOWN",
        quoteTokenName: event.quote_token?.contract_name ?? previous?.quoteTokenName ?? null,
        quoteTokenSymbol:
          event.quote_token?.contract_ticker_symbol ?? previous?.quoteTokenSymbol ?? "UNKNOWN",
        lastSeenAt: eventTime,
        currentStatus: "tracked",
        trackingTier: "hot",
      },
      create: {
        chainName: event.chain_name,
        protocol: "UNKNOWN",
        pairAddress: event.pair_address,
        baseTokenAddress: event.base_token?.contract_address ?? event.pair_address,
        baseTokenName: event.base_token?.contract_name ?? null,
        baseTokenSymbol: event.base_token?.contract_ticker_symbol ?? "UNKNOWN",
        quoteTokenAddress: event.quote_token?.contract_address ?? "UNKNOWN",
        quoteTokenName: event.quote_token?.contract_name ?? null,
        quoteTokenSymbol: event.quote_token?.contract_ticker_symbol ?? "UNKNOWN",
        firstSeenAt: eventTime,
        lastSeenAt: eventTime,
        currentStatus: "tracked",
        trackingTier: "hot",
      },
      include: launchWithStateInclude,
    });

    const duplicateEvent = await tx.launchEvent.findFirst({
      where: {
        launchId: launch.id,
        eventType: "pair_updated",
        eventTime,
        sourceStream: "updatePairs",
        payloadJson,
      },
    });

    const pairCandleSummary = await loadPairCandleSummary(tx, launch.id);
    const tokenCandleSummary = await loadTokenCandleSummary(tx, launch.id);
    const resolvedCandleSummary = resolveCandleSummary(pairCandleSummary, tokenCandleSummary);
    const hasResolvedCandleData =
      resolvedCandleSummary.lastPairCandleAt !== null ||
      resolvedCandleSummary.lastTokenCandleAt !== null;

    const draftLaunch = {
      ...launch,
      state: {
        ...launch.state,
        launchId: launch.id,
        lastEventAt: eventTime,
        lastPairCandleAt:
          pairCandleSummary.lastPairCandleAt ?? launch.state?.lastPairCandleAt ?? null,
        lastTokenCandleAt:
          tokenCandleSummary.lastTokenCandleAt ?? launch.state?.lastTokenCandleAt ?? null,
        currentQuoteRate:
          event.quote_rate ??
          resolvedCandleSummary.currentQuoteRate ??
          launch.state?.currentQuoteRate ??
          null,
        currentQuoteRateUsd:
          event.quote_rate_usd ??
          resolvedCandleSummary.currentQuoteRateUsd ??
          launch.state?.currentQuoteRateUsd ??
          null,
        currentLiquidityUsd: event.liquidity ?? launch.state?.currentLiquidityUsd ?? null,
        currentMarketCapUsd: event.market_cap ?? launch.state?.currentMarketCapUsd ?? null,
        currentVolume1mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume1mUsd
          : (launch.state?.currentVolume1mUsd ?? 0),
        currentVolume5mUsd:
          event.last_5m?.volume_usd?.current_value ?? launch.state?.currentVolume5mUsd ?? 0,
        currentVolume15mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume15mUsd
          : (launch.state?.currentVolume15mUsd ?? 0),
        currentVolume1hUsd:
          event.last_1hr?.volume_usd?.current_value ?? launch.state?.currentVolume1hUsd ?? 0,
        priceChange1mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange1mPct
          : (launch.state?.priceChange1mPct ?? 0),
        currentSwapCount5m: safeInteger(
          event.last_5m?.swap_count?.current_value ?? launch.state?.currentSwapCount5m,
        ),
        currentSwapCount1h: safeInteger(
          event.last_1hr?.swap_count?.current_value ?? launch.state?.currentSwapCount1h,
        ),
        priceChange5mPct: event.last_5m?.price?.pct_change ?? launch.state?.priceChange5mPct ?? 0,
        priceChange15mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange15mPct
          : (launch.state?.priceChange15mPct ?? 0),
        priceChange1hPct: event.last_1hr?.price?.pct_change ?? launch.state?.priceChange1hPct ?? 0,
        scoreGlobal: launch.state?.scoreGlobal ?? 0,
        delta1m: launch.state?.delta1m ?? 0,
        delta5m: launch.state?.delta5m ?? 0,
        delta15m: launch.state?.delta15m ?? 0,
        delta1h: launch.state?.delta1h ?? 0,
        verdictGlobal: launch.state?.verdictGlobal ?? "ignore",
        verdictMomentum: launch.state?.verdictMomentum ?? "ignore",
        verdictDegen: launch.state?.verdictDegen ?? "ignore",
        verdictRiskFirst: launch.state?.verdictRiskFirst ?? "ignore",
        reasonCodesJson: launch.state?.reasonCodesJson ?? null,
        invalidatorsJson: launch.state?.invalidatorsJson ?? null,
        updatedAt: launch.state?.updatedAt ?? eventTime,
      },
    };

    if (duplicateEvent) {
      const currentScore = scoreLaunch(toSnapshot(draftLaunch));

      return {
        launchId: launch.id,
        pairAddress: launch.pairAddress,
        score: currentScore.score,
        verdict: currentScore.verdict,
        duplicate: true,
        analystTriggers: [],
      };
    }

    const scored = scoreLaunch(toSnapshot(draftLaunch));

    await tx.launchState.upsert({
      where: { launchId: launch.id },
      update: {
        lastEventAt: eventTime,
        lastPairCandleAt: pairCandleSummary.lastPairCandleAt ?? undefined,
        lastTokenCandleAt: tokenCandleSummary.lastTokenCandleAt ?? undefined,
        currentQuoteRate: event.quote_rate ?? resolvedCandleSummary.currentQuoteRate ?? undefined,
        currentQuoteRateUsd:
          event.quote_rate_usd ?? resolvedCandleSummary.currentQuoteRateUsd ?? undefined,
        currentLiquidityUsd: event.liquidity ?? undefined,
        currentMarketCapUsd: event.market_cap ?? undefined,
        currentVolume1mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume1mUsd
          : undefined,
        currentVolume5mUsd: event.last_5m?.volume_usd?.current_value ?? undefined,
        currentVolume15mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume15mUsd
          : undefined,
        currentVolume1hUsd: event.last_1hr?.volume_usd?.current_value ?? undefined,
        priceChange1mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange1mPct
          : undefined,
        currentSwapCount5m: optionalInteger(event.last_5m?.swap_count?.current_value),
        currentSwapCount1h: optionalInteger(event.last_1hr?.swap_count?.current_value),
        priceChange5mPct: event.last_5m?.price?.pct_change ?? undefined,
        priceChange15mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange15mPct
          : undefined,
        priceChange1hPct: event.last_1hr?.price?.pct_change ?? undefined,
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
      create: {
        launchId: launch.id,
        lastEventAt: eventTime,
        lastPairCandleAt: pairCandleSummary.lastPairCandleAt,
        lastTokenCandleAt: tokenCandleSummary.lastTokenCandleAt,
        currentQuoteRate: event.quote_rate ?? resolvedCandleSummary.currentQuoteRate ?? null,
        currentQuoteRateUsd:
          event.quote_rate_usd ?? resolvedCandleSummary.currentQuoteRateUsd ?? null,
        currentLiquidityUsd: event.liquidity ?? null,
        currentMarketCapUsd: event.market_cap ?? null,
        currentVolume1mUsd: safeNumber(resolvedCandleSummary.currentVolume1mUsd),
        currentVolume5mUsd: safeNumber(event.last_5m?.volume_usd?.current_value),
        currentVolume15mUsd: safeNumber(resolvedCandleSummary.currentVolume15mUsd),
        currentVolume1hUsd: safeNumber(event.last_1hr?.volume_usd?.current_value),
        priceChange1mPct: safeNumber(resolvedCandleSummary.priceChange1mPct),
        currentSwapCount5m: safeInteger(event.last_5m?.swap_count?.current_value),
        currentSwapCount1h: safeInteger(event.last_1hr?.swap_count?.current_value),
        priceChange5mPct: safeNumber(event.last_5m?.price?.pct_change),
        priceChange15mPct: safeNumber(resolvedCandleSummary.priceChange15mPct),
        priceChange1hPct: safeNumber(event.last_1hr?.price?.pct_change),
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
    });

    await tx.launchEvent.create({
      data: {
        launchId: launch.id,
        eventType: "pair_updated",
        eventTime,
        sourceStream: "updatePairs",
        payloadJson,
      },
    });

    const timelineEntries = buildTimelineEntries({
      launchId: launch.id,
      previous: previous?.state ?? null,
      scored,
      eventTime,
    });

    const recommendationTimelineEntries = await syncRecommendations({
      tx,
      launchId: launch.id,
      scored,
      previousState: previous?.state ?? null,
      eventTime,
      sourceStream: "updatePairs",
    });

    const allTimelineEntries = [...timelineEntries, ...recommendationTimelineEntries];

    if (allTimelineEntries.length > 0) {
      await tx.launchTimeline.createMany({
        data: allTimelineEntries,
      });
    }

    await recordAlertsForTransitions({
      tx,
      entries: allTimelineEntries,
      scored,
    });

    return {
      launchId: launch.id,
      pairAddress: launch.pairAddress,
      score: scored.score,
      verdict: scored.verdict,
      duplicate: false,
      analystTriggers: timelineEntriesToAnalystTriggers(allTimelineEntries),
    };
  });
};

export const applyPairOhlcvCandle = async (event: GoldRushOhlcvPairCandleEvent) => {
  const eventTime = new Date(event.timestamp);

  return prisma.$transaction(async (tx) => {
    const previous = await tx.launch.findUnique({
      where: { pairAddress: event.pair_address },
      include: launchWithStateInclude,
    });

    const launch = await tx.launch.upsert({
      where: { pairAddress: event.pair_address },
      update: {
        chainName: event.chain_name,
        protocol: previous?.protocol ?? "UNKNOWN",
        baseTokenAddress:
          event.base_token?.contract_address ?? previous?.baseTokenAddress ?? event.pair_address,
        baseTokenName: event.base_token?.contract_name ?? previous?.baseTokenName ?? null,
        baseTokenSymbol:
          event.base_token?.contract_ticker_symbol ?? previous?.baseTokenSymbol ?? "UNKNOWN",
        quoteTokenAddress:
          event.quote_token?.contract_address ?? previous?.quoteTokenAddress ?? "UNKNOWN",
        quoteTokenName: event.quote_token?.contract_name ?? previous?.quoteTokenName ?? null,
        quoteTokenSymbol:
          event.quote_token?.contract_ticker_symbol ?? previous?.quoteTokenSymbol ?? "UNKNOWN",
        lastSeenAt: eventTime,
        currentStatus: "tracked",
        trackingTier: "hot",
      },
      create: {
        chainName: event.chain_name,
        protocol: "UNKNOWN",
        pairAddress: event.pair_address,
        baseTokenAddress: event.base_token?.contract_address ?? event.pair_address,
        baseTokenName: event.base_token?.contract_name ?? null,
        baseTokenSymbol: event.base_token?.contract_ticker_symbol ?? "UNKNOWN",
        quoteTokenAddress: event.quote_token?.contract_address ?? "UNKNOWN",
        quoteTokenName: event.quote_token?.contract_name ?? null,
        quoteTokenSymbol: event.quote_token?.contract_ticker_symbol ?? "UNKNOWN",
        firstSeenAt: eventTime,
        lastSeenAt: eventTime,
        currentStatus: "tracked",
        trackingTier: "hot",
      },
      include: launchWithStateInclude,
    });

    const existingCandle = await tx.launchPairCandle.findUnique({
      where: {
        launchId_interval_timeframe_timestamp: {
          launchId: launch.id,
          interval: event.interval,
          timeframe: event.timeframe,
          timestamp: eventTime,
        },
      },
    });

    if (existingCandle) {
      const currentScore = scoreLaunch(toSnapshot(launch));

      return {
        launchId: launch.id,
        pairAddress: launch.pairAddress,
        score: currentScore.score,
        verdict: currentScore.verdict,
        duplicate: true,
        analystTriggers: [],
      };
    }

    await tx.launchPairCandle.create({
      data: {
        launchId: launch.id,
        interval: event.interval,
        timeframe: event.timeframe,
        timestamp: eventTime,
        open: event.open,
        high: event.high,
        low: event.low,
        close: event.close,
        volume: event.volume ?? null,
        volumeUsd: event.volume_usd ?? null,
        quoteRate: event.quote_rate ?? null,
        quoteRateUsd: event.quote_rate_usd ?? null,
      },
    });

    await tx.launchEvent.create({
      data: {
        launchId: launch.id,
        eventType: "pair_ohlcv_candle",
        eventTime,
        sourceStream: "ohlcvCandlesForPair",
        payloadJson: JSON.stringify(event),
      },
    });

    const pairCandleSummary = await loadPairCandleSummary(tx, launch.id);
    const tokenCandleSummary = await loadTokenCandleSummary(tx, launch.id);
    const resolvedCandleSummary = resolveCandleSummary(pairCandleSummary, tokenCandleSummary);

    const draftLaunch = {
      ...launch,
      state: {
        ...launch.state,
        launchId: launch.id,
        lastEventAt: eventTime,
        lastPairCandleAt: pairCandleSummary.lastPairCandleAt ?? eventTime,
        lastTokenCandleAt:
          tokenCandleSummary.lastTokenCandleAt ?? launch.state?.lastTokenCandleAt ?? null,
        currentQuoteRate:
          event.quote_rate ??
          resolvedCandleSummary.currentQuoteRate ??
          launch.state?.currentQuoteRate ??
          null,
        currentQuoteRateUsd:
          event.quote_rate_usd ??
          resolvedCandleSummary.currentQuoteRateUsd ??
          launch.state?.currentQuoteRateUsd ??
          null,
        currentLiquidityUsd: launch.state?.currentLiquidityUsd ?? null,
        currentMarketCapUsd: launch.state?.currentMarketCapUsd ?? null,
        currentVolume1mUsd: resolvedCandleSummary.currentVolume1mUsd,
        currentVolume5mUsd: launch.state?.currentVolume5mUsd ?? 0,
        currentVolume15mUsd: resolvedCandleSummary.currentVolume15mUsd,
        currentVolume1hUsd: launch.state?.currentVolume1hUsd ?? 0,
        priceChange1mPct: resolvedCandleSummary.priceChange1mPct,
        currentSwapCount5m: launch.state?.currentSwapCount5m ?? 0,
        currentSwapCount1h: launch.state?.currentSwapCount1h ?? 0,
        priceChange5mPct: launch.state?.priceChange5mPct ?? 0,
        priceChange15mPct: resolvedCandleSummary.priceChange15mPct,
        priceChange1hPct: launch.state?.priceChange1hPct ?? 0,
        scoreGlobal: launch.state?.scoreGlobal ?? 0,
        delta1m: launch.state?.delta1m ?? 0,
        delta5m: launch.state?.delta5m ?? 0,
        delta15m: launch.state?.delta15m ?? 0,
        delta1h: launch.state?.delta1h ?? 0,
        verdictGlobal: launch.state?.verdictGlobal ?? "ignore",
        verdictMomentum: launch.state?.verdictMomentum ?? "ignore",
        verdictDegen: launch.state?.verdictDegen ?? "ignore",
        verdictRiskFirst: launch.state?.verdictRiskFirst ?? "ignore",
        reasonCodesJson: launch.state?.reasonCodesJson ?? null,
        invalidatorsJson: launch.state?.invalidatorsJson ?? null,
        updatedAt: launch.state?.updatedAt ?? eventTime,
      },
    };

    const scored = scoreLaunch(toSnapshot(draftLaunch));

    await tx.launchState.upsert({
      where: { launchId: launch.id },
      update: {
        lastEventAt: eventTime,
        lastPairCandleAt: pairCandleSummary.lastPairCandleAt ?? eventTime,
        lastTokenCandleAt: tokenCandleSummary.lastTokenCandleAt ?? undefined,
        currentQuoteRate: event.quote_rate ?? resolvedCandleSummary.currentQuoteRate ?? undefined,
        currentQuoteRateUsd:
          event.quote_rate_usd ?? resolvedCandleSummary.currentQuoteRateUsd ?? undefined,
        currentVolume1mUsd: resolvedCandleSummary.currentVolume1mUsd,
        currentVolume15mUsd: resolvedCandleSummary.currentVolume15mUsd,
        priceChange1mPct: resolvedCandleSummary.priceChange1mPct,
        priceChange15mPct: resolvedCandleSummary.priceChange15mPct,
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
      create: {
        launchId: launch.id,
        lastEventAt: eventTime,
        lastPairCandleAt: pairCandleSummary.lastPairCandleAt ?? eventTime,
        lastTokenCandleAt: tokenCandleSummary.lastTokenCandleAt,
        currentQuoteRate: event.quote_rate ?? resolvedCandleSummary.currentQuoteRate ?? null,
        currentQuoteRateUsd:
          event.quote_rate_usd ?? resolvedCandleSummary.currentQuoteRateUsd ?? null,
        currentLiquidityUsd: null,
        currentMarketCapUsd: null,
        currentVolume1mUsd: resolvedCandleSummary.currentVolume1mUsd,
        currentVolume5mUsd: 0,
        currentVolume15mUsd: resolvedCandleSummary.currentVolume15mUsd,
        currentVolume1hUsd: 0,
        priceChange1mPct: resolvedCandleSummary.priceChange1mPct,
        currentSwapCount5m: 0,
        currentSwapCount1h: 0,
        priceChange5mPct: 0,
        priceChange15mPct: resolvedCandleSummary.priceChange15mPct,
        priceChange1hPct: 0,
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
    });

    const timelineEntries = buildTimelineEntries({
      launchId: launch.id,
      previous: previous?.state ?? null,
      scored,
      eventTime,
    });

    const recommendationTimelineEntries = await syncRecommendations({
      tx,
      launchId: launch.id,
      scored,
      previousState: previous?.state ?? null,
      eventTime,
      sourceStream: "ohlcvCandlesForPair",
    });

    const allTimelineEntries = [...timelineEntries, ...recommendationTimelineEntries];

    if (allTimelineEntries.length > 0) {
      await tx.launchTimeline.createMany({
        data: allTimelineEntries,
      });
    }

    await recordAlertsForTransitions({
      tx,
      entries: allTimelineEntries,
      scored,
    });

    return {
      launchId: launch.id,
      pairAddress: launch.pairAddress,
      score: scored.score,
      verdict: scored.verdict,
      duplicate: false,
      analystTriggers: timelineEntriesToAnalystTriggers(allTimelineEntries),
    };
  });
};

export const applyTokenOhlcvCandle = async (event: GoldRushOhlcvTokenCandleEvent) => {
  const eventTime = new Date(event.timestamp);
  const launchWhere: Prisma.LaunchWhereInput[] = [];

  if (event.pair_address) {
    launchWhere.push({ pairAddress: event.pair_address });
  }

  if (event.base_token?.contract_address) {
    launchWhere.push({ baseTokenAddress: event.base_token.contract_address });
  }

  if (launchWhere.length === 0) {
    return {
      launchId: "",
      pairAddress: event.pair_address ?? "UNKNOWN",
      score: 0,
      verdict: "ignore" as const,
      duplicate: true,
      analystTriggers: [],
    };
  }

  return prisma.$transaction(async (tx) => {
    const previous = await tx.launch.findFirst({
      where: {
        OR: launchWhere,
      },
      orderBy: [{ lastSeenAt: "desc" }, { firstSeenAt: "desc" }],
      include: launchWithStateInclude,
    });

    if (!previous) {
      return {
        launchId: "",
        pairAddress: event.pair_address ?? event.base_token?.contract_address ?? "UNKNOWN",
        score: 0,
        verdict: "ignore" as const,
        duplicate: true,
        analystTriggers: [],
      };
    }

    const existingCandle = await tx.launchTokenCandle.findUnique({
      where: {
        launchId_interval_timeframe_timestamp: {
          launchId: previous.id,
          interval: event.interval,
          timeframe: event.timeframe,
          timestamp: eventTime,
        },
      },
    });

    if (existingCandle) {
      const currentScore = scoreLaunch(toSnapshot(previous));

      return {
        launchId: previous.id,
        pairAddress: previous.pairAddress,
        score: currentScore.score,
        verdict: currentScore.verdict,
        duplicate: true,
        analystTriggers: [],
      };
    }

    await tx.launchTokenCandle.create({
      data: {
        launchId: previous.id,
        primaryPairAddress: event.pair_address ?? null,
        interval: event.interval,
        timeframe: event.timeframe,
        timestamp: eventTime,
        open: event.open,
        high: event.high,
        low: event.low,
        close: event.close,
        volume: event.volume ?? null,
        volumeUsd: event.volume_usd ?? null,
        quoteRate: event.quote_rate ?? null,
        quoteRateUsd: event.quote_rate_usd ?? null,
      },
    });

    await tx.launchEvent.create({
      data: {
        launchId: previous.id,
        eventType: "token_ohlcv_candle",
        eventTime,
        sourceStream: "ohlcvCandlesForToken",
        payloadJson: JSON.stringify(event),
      },
    });

    const pairCandleSummary = await loadPairCandleSummary(tx, previous.id);
    const tokenCandleSummary = await loadTokenCandleSummary(tx, previous.id);
    const resolvedCandleSummary = resolveCandleSummary(pairCandleSummary, tokenCandleSummary);
    const hasResolvedCandleData =
      resolvedCandleSummary.lastPairCandleAt !== null ||
      resolvedCandleSummary.lastTokenCandleAt !== null;

    const draftLaunch = {
      ...previous,
      state: {
        ...previous.state,
        launchId: previous.id,
        lastEventAt: eventTime,
        lastPairCandleAt:
          pairCandleSummary.lastPairCandleAt ?? previous.state?.lastPairCandleAt ?? null,
        lastTokenCandleAt: tokenCandleSummary.lastTokenCandleAt ?? eventTime,
        currentQuoteRate:
          event.quote_rate ??
          resolvedCandleSummary.currentQuoteRate ??
          previous.state?.currentQuoteRate ??
          null,
        currentQuoteRateUsd:
          event.quote_rate_usd ??
          resolvedCandleSummary.currentQuoteRateUsd ??
          previous.state?.currentQuoteRateUsd ??
          null,
        currentLiquidityUsd: previous.state?.currentLiquidityUsd ?? null,
        currentMarketCapUsd: previous.state?.currentMarketCapUsd ?? null,
        currentVolume1mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume1mUsd
          : (previous.state?.currentVolume1mUsd ?? 0),
        currentVolume5mUsd: previous.state?.currentVolume5mUsd ?? 0,
        currentVolume15mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume15mUsd
          : (previous.state?.currentVolume15mUsd ?? 0),
        currentVolume1hUsd: previous.state?.currentVolume1hUsd ?? 0,
        priceChange1mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange1mPct
          : (previous.state?.priceChange1mPct ?? 0),
        currentSwapCount5m: previous.state?.currentSwapCount5m ?? 0,
        currentSwapCount1h: previous.state?.currentSwapCount1h ?? 0,
        priceChange5mPct: previous.state?.priceChange5mPct ?? 0,
        priceChange15mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange15mPct
          : (previous.state?.priceChange15mPct ?? 0),
        priceChange1hPct: previous.state?.priceChange1hPct ?? 0,
        scoreGlobal: previous.state?.scoreGlobal ?? 0,
        delta1m: previous.state?.delta1m ?? 0,
        delta5m: previous.state?.delta5m ?? 0,
        delta15m: previous.state?.delta15m ?? 0,
        delta1h: previous.state?.delta1h ?? 0,
        verdictGlobal: previous.state?.verdictGlobal ?? "ignore",
        verdictMomentum: previous.state?.verdictMomentum ?? "ignore",
        verdictDegen: previous.state?.verdictDegen ?? "ignore",
        verdictRiskFirst: previous.state?.verdictRiskFirst ?? "ignore",
        reasonCodesJson: previous.state?.reasonCodesJson ?? null,
        invalidatorsJson: previous.state?.invalidatorsJson ?? null,
        updatedAt: previous.state?.updatedAt ?? eventTime,
      },
    };

    const scored = scoreLaunch(toSnapshot(draftLaunch));

    await tx.launchState.upsert({
      where: { launchId: previous.id },
      update: {
        lastEventAt: eventTime,
        lastPairCandleAt: pairCandleSummary.lastPairCandleAt ?? undefined,
        lastTokenCandleAt: tokenCandleSummary.lastTokenCandleAt ?? eventTime,
        currentQuoteRate: event.quote_rate ?? resolvedCandleSummary.currentQuoteRate ?? undefined,
        currentQuoteRateUsd:
          event.quote_rate_usd ?? resolvedCandleSummary.currentQuoteRateUsd ?? undefined,
        currentLiquidityUsd: previous.state?.currentLiquidityUsd ?? undefined,
        currentMarketCapUsd: previous.state?.currentMarketCapUsd ?? undefined,
        currentVolume1mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume1mUsd
          : undefined,
        currentVolume5mUsd: previous.state?.currentVolume5mUsd ?? undefined,
        currentVolume15mUsd: hasResolvedCandleData
          ? resolvedCandleSummary.currentVolume15mUsd
          : undefined,
        currentVolume1hUsd: previous.state?.currentVolume1hUsd ?? undefined,
        priceChange1mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange1mPct
          : undefined,
        currentSwapCount5m: previous.state?.currentSwapCount5m ?? undefined,
        currentSwapCount1h: previous.state?.currentSwapCount1h ?? undefined,
        priceChange5mPct: previous.state?.priceChange5mPct ?? undefined,
        priceChange15mPct: hasResolvedCandleData
          ? resolvedCandleSummary.priceChange15mPct
          : undefined,
        priceChange1hPct: previous.state?.priceChange1hPct ?? undefined,
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
      create: {
        launchId: previous.id,
        lastEventAt: eventTime,
        lastPairCandleAt: pairCandleSummary.lastPairCandleAt,
        lastTokenCandleAt: tokenCandleSummary.lastTokenCandleAt ?? eventTime,
        currentQuoteRate: event.quote_rate ?? resolvedCandleSummary.currentQuoteRate ?? null,
        currentQuoteRateUsd:
          event.quote_rate_usd ?? resolvedCandleSummary.currentQuoteRateUsd ?? null,
        currentLiquidityUsd: previous.state?.currentLiquidityUsd ?? null,
        currentMarketCapUsd: previous.state?.currentMarketCapUsd ?? null,
        currentVolume1mUsd: safeNumber(resolvedCandleSummary.currentVolume1mUsd),
        currentVolume5mUsd: safeNumber(previous.state?.currentVolume5mUsd),
        currentVolume15mUsd: safeNumber(resolvedCandleSummary.currentVolume15mUsd),
        currentVolume1hUsd: safeNumber(previous.state?.currentVolume1hUsd),
        priceChange1mPct: safeNumber(resolvedCandleSummary.priceChange1mPct),
        currentSwapCount5m: safeInteger(previous.state?.currentSwapCount5m),
        currentSwapCount1h: safeInteger(previous.state?.currentSwapCount1h),
        priceChange5mPct: safeNumber(previous.state?.priceChange5mPct),
        priceChange15mPct: safeNumber(resolvedCandleSummary.priceChange15mPct),
        priceChange1hPct: safeNumber(previous.state?.priceChange1hPct),
        scoreGlobal: scored.score,
        delta1m: scored.delta1m,
        delta5m: scored.delta5m,
        delta15m: scored.delta15m,
        delta1h: scored.delta1h,
        verdictGlobal: verdictValue(scored.verdict),
        verdictMomentum: verdictValue(scored.personaVerdicts.momentum),
        verdictDegen: verdictValue(scored.personaVerdicts.degen),
        verdictRiskFirst: verdictValue(scored.personaVerdicts["risk-first"]),
        reasonCodesJson: JSON.stringify(scored.reasons),
        invalidatorsJson: JSON.stringify(
          scored.reasons.filter((reason) => reason === "SETUP_INVALIDATED"),
        ),
      },
    });

    const timelineEntries = buildTimelineEntries({
      launchId: previous.id,
      previous: previous.state ?? null,
      scored,
      eventTime,
    });

    const recommendationTimelineEntries = await syncRecommendations({
      tx,
      launchId: previous.id,
      scored,
      previousState: previous.state ?? null,
      eventTime,
      sourceStream: "ohlcvCandlesForToken",
    });

    const allTimelineEntries = [...timelineEntries, ...recommendationTimelineEntries];

    if (allTimelineEntries.length > 0) {
      await tx.launchTimeline.createMany({
        data: allTimelineEntries,
      });
    }

    await recordAlertsForTransitions({
      tx,
      entries: allTimelineEntries,
      scored,
    });

    return {
      launchId: previous.id,
      pairAddress: previous.pairAddress,
      score: scored.score,
      verdict: scored.verdict,
      duplicate: false,
      analystTriggers: timelineEntriesToAnalystTriggers(allTimelineEntries),
    };
  });
};

export type WalletHoldingSignal = {
  launchId: string;
  pairAddress: string;
  pairName: string;
  baseTokenAddress: string;
  baseTokenSymbol: string;
  baseTokenName: string;
  score: number;
  verdict: string;
  reasonCodes: string[];
  delta5m: number;
  liquidityUsd: number;
  lastSeenAt: string;
  recentAlerts: { alertType: string; title: string; severity: string; createdAt: string }[];
};

export async function getDemoHoldingSignals(): Promise<WalletHoldingSignal[]> {
  // Prefer non-ignore launches with the highest scores for a compelling demo
  const launches = await prisma.launch.findMany({
    where: {
      baseTokenAddress: { not: "" },
      state: { verdictGlobal: { not: "ignore" } },
    },
    include: {
      state: true,
      alerts: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { state: { scoreGlobal: "desc" } },
    take: 5,
  });

  return launches.map((l) => ({
    launchId: l.id,
    pairAddress: l.pairAddress,
    pairName: l.pairName ?? "",
    baseTokenAddress: l.baseTokenAddress ?? "",
    baseTokenSymbol: l.baseTokenSymbol ?? "",
    baseTokenName: l.baseTokenName ?? "",
    score: l.state?.scoreGlobal ?? 0,
    verdict: (l.state?.verdictGlobal ?? "ignore") as string,
    reasonCodes: JSON.parse(l.state?.reasonCodesJson ?? "[]") as string[],
    delta5m: l.state?.delta5m ?? 0,
    liquidityUsd: l.state?.currentLiquidityUsd ?? 0,
    lastSeenAt: (l.lastSeenAt ?? new Date()).toISOString(),
    recentAlerts: l.alerts.map((a) => ({
      alertType: a.alertType,
      title: a.title,
      severity: a.severity as string,
      createdAt: a.createdAt.toISOString(),
    })),
  }));
}

export async function getWalletHoldingSignals(
  mintAddresses: string[],
): Promise<WalletHoldingSignal[]> {
  if (mintAddresses.length === 0) return [];

  const launches = await prisma.launch.findMany({
    where: { baseTokenAddress: { in: mintAddresses } },
    include: {
      state: true,
      alerts: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
  });

  return launches.map((l) => ({
    launchId: l.id,
    pairAddress: l.pairAddress,
    pairName: l.pairName ?? "",
    baseTokenAddress: l.baseTokenAddress ?? "",
    baseTokenSymbol: l.baseTokenSymbol ?? "",
    baseTokenName: l.baseTokenName ?? "",
    score: l.state?.scoreGlobal ?? 0,
    verdict: (l.state?.verdictGlobal ?? "ignore") as string,
    reasonCodes: JSON.parse(l.state?.reasonCodesJson ?? "[]") as string[],
    delta5m: l.state?.delta5m ?? 0,
    liquidityUsd: l.state?.currentLiquidityUsd ?? 0,
    lastSeenAt: (l.lastSeenAt ?? new Date()).toISOString(),
    recentAlerts: l.alerts.map((a) => ({
      alertType: a.alertType,
      title: a.title,
      severity: a.severity as string,
      createdAt: a.createdAt.toISOString(),
    })),
  }));
}
