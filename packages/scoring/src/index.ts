import type {
  LaunchInsightMemo,
  LaunchSnapshot,
  Persona,
  ReasonCode,
  ScoredLaunch,
  Verdict,
} from "@jaguar/domain";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const verdictFromScore = (score: number): Verdict => {
  if (score >= 60) return "enter";
  if (score >= 30) return "watch";
  return "ignore";
};

export const personaOffset = (persona: Persona) => {
  switch (persona) {
    case "degen":
      return 5;
    case "momentum":
      return 0;
    case "risk-first":
      return -8;
  }
};

export const personaScore = (score: number, persona: Persona) =>
  Math.round(clamp(score + personaOffset(persona), 0, 100));

export const personaVerdict = (score: number, persona: Persona) =>
  verdictFromScore(personaScore(score, persona));

const reasonSet = (launch: LaunchSnapshot): ReasonCode[] => {
  const reasons: ReasonCode[] = [];
  const hasExecutionData =
    launch.liquidityUsd > 0 ||
    launch.volume1mUsd > 0 ||
    launch.volume5mUsd > 0 ||
    launch.volume15mUsd > 0 ||
    launch.volume1hUsd > 0 ||
    launch.swapCount5m > 0 ||
    launch.swapCount1h > 0;
  const hasMomentumData =
    launch.priceChange1mPct !== 0 ||
    launch.priceChange5mPct !== 0 ||
    launch.priceChange15mPct !== 0 ||
    launch.priceChange1hPct !== 0 ||
    launch.quoteRateUsd > 0;

  if (!hasExecutionData && !hasMomentumData) {
    reasons.push("DATA_TOO_SPARSE");
  }

  if (launch.liquidityUsd >= 50_000) reasons.push("LIQUIDITY_SURGED");
  if (launch.liquidityUsd < 10_000) reasons.push("LIQUIDITY_DROPPED");
  if (
    launch.volume1mUsd >= 2_500 ||
    launch.volume5mUsd >= 20_000 ||
    launch.volume15mUsd >= 35_000 ||
    launch.volume1hUsd >= 80_000
  ) {
    reasons.push("VOLUME_ACCELERATED");
  }
  if (launch.volume1mUsd < 500 && launch.volume5mUsd < 4_000 && launch.volume15mUsd < 12_000) {
    reasons.push("VOLUME_STALLED");
  }
  if (
    launch.priceChange1mPct >= 4 ||
    launch.priceChange5mPct >= 8 ||
    launch.priceChange15mPct >= 12
  ) {
    reasons.push("BREAKOUT_CONFIRMED");
  }
  if (
    launch.priceChange1mPct <= -4 ||
    launch.priceChange5mPct <= -8 ||
    launch.priceChange15mPct <= -12
  ) {
    reasons.push("BREAKOUT_FAILED");
  }
  if (
    Math.abs(launch.priceChange1mPct) >= 8 ||
    Math.abs(launch.priceChange5mPct) >= 20 ||
    Math.abs(launch.priceChange15mPct) >= 28 ||
    Math.abs(launch.priceChange1hPct) >= 35
  ) {
    reasons.push("VOLATILITY_TOO_HIGH");
  }
  if (launch.marketCapUsd >= 250_000) reasons.push("MARKET_CAP_EXPANDING");
  if (
    launch.priceChange5mPct <= -12 ||
    launch.priceChange15mPct <= -18 ||
    launch.priceChange1hPct <= -25
  ) {
    reasons.push("SETUP_INVALIDATED");
  }

  return reasons;
};

export const scoreLaunch = (launch: LaunchSnapshot): ScoredLaunch => {
  const hasExecutionData =
    launch.liquidityUsd > 0 ||
    launch.volume1mUsd > 0 ||
    launch.volume5mUsd > 0 ||
    launch.volume15mUsd > 0 ||
    launch.volume1hUsd > 0 ||
    launch.swapCount5m > 0 ||
    launch.swapCount1h > 0;
  const hasMomentumData =
    launch.priceChange1mPct !== 0 ||
    launch.priceChange5mPct !== 0 ||
    launch.priceChange15mPct !== 0 ||
    launch.priceChange1hPct !== 0;
  const hasMarketContext = launch.marketCapUsd > 0 || launch.quoteRateUsd > 0;

  const liquidityScore = clamp(launch.liquidityUsd / 40_000, 0, 1) * 24;
  const marketCapScore = clamp(launch.marketCapUsd / 300_000, 0, 1) * 12;
  const volumeScore =
    clamp(launch.volume1mUsd / 3_000, 0, 1) * 6 +
    clamp(launch.volume5mUsd / 20_000, 0, 1) * 14 +
    clamp(launch.volume15mUsd / 45_000, 0, 1) * 10 +
    clamp(launch.volume1hUsd / 90_000, 0, 1) * 6;
  const momentumScore =
    clamp(launch.priceChange1mPct / 4, 0, 1) * 8 +
    clamp(launch.priceChange5mPct / 15, 0, 1) * 10 +
    clamp(launch.priceChange15mPct / 18, 0, 1) * 10 +
    clamp(launch.priceChange1hPct / 30, 0, 1) * 4;
  const activityScore =
    clamp(launch.swapCount5m / 16, 0, 1) * 8 + clamp(launch.swapCount1h / 80, 0, 1) * 4;
  const freshnessScore = clamp((120 - launch.ageMinutes) / 120, 0, 1) * 6;
  const dataConfidenceScore =
    (hasExecutionData ? 8 : 0) + (hasMomentumData ? 6 : 0) + (hasMarketContext ? 6 : 0);
  const sparsePenalty = !hasExecutionData ? 8 : 0;
  const riskPenalty =
    clamp(Math.abs(launch.priceChange1mPct) / 15, 0, 1) * 4 +
    clamp(Math.abs(launch.priceChange5mPct) / 40, 0, 1) * 10 +
    clamp(Math.abs(launch.priceChange15mPct) / 45, 0, 1) * 6 +
    (launch.liquidityUsd > 0 && launch.liquidityUsd < 8_000 ? 8 : 0) +
    (launch.priceChange1hPct < -20 ? 10 : 0);

  const rawScore =
    liquidityScore +
    marketCapScore +
    volumeScore +
    momentumScore +
    activityScore +
    dataConfidenceScore +
    freshnessScore -
    sparsePenalty -
    riskPenalty;

  const score = Math.round(clamp(rawScore, 0, 100));
  const delta1m = Math.round(clamp(launch.priceChange1mPct + launch.volume1mUsd / 1_000, -20, 20));
  const delta5m = Math.round(clamp(launch.priceChange5mPct + launch.volume5mUsd / 4_000, -30, 30));
  const delta15m = Math.round(
    clamp(launch.priceChange15mPct + launch.volume15mUsd / 8_000, -35, 35),
  );
  const delta1h = Math.round(clamp(launch.priceChange1hPct + launch.volume1hUsd / 25_000, -35, 35));
  const reasons = reasonSet(launch);

  const personaVerdicts = {
    degen: personaVerdict(score, "degen"),
    momentum: personaVerdict(score, "momentum"),
    "risk-first": personaVerdict(score, "risk-first"),
  } satisfies Record<Persona, Verdict>;

  return {
    ...launch,
    score,
    delta1m,
    delta5m,
    delta15m,
    delta1h,
    verdict: verdictFromScore(score),
    personaVerdicts,
    reasons,
  };
};

export const scoreLaunchBoard = (launches: LaunchSnapshot[], persona: Persona = "momentum") =>
  launches.map(scoreLaunch).sort((a, b) => {
    const leftScore = personaScore(a.score, persona);
    const rightScore = personaScore(b.score, persona);

    if (rightScore !== leftScore) return rightScore - leftScore;
    if (b.delta15m !== a.delta15m) return b.delta15m - a.delta15m;
    if (b.delta5m !== a.delta5m) return b.delta5m - a.delta5m;
    if (b.delta1m !== a.delta1m) return b.delta1m - a.delta1m;
    return new Date(b.lastEventAt).getTime() - new Date(a.lastEventAt).getTime();
  });

export const buildLaunchMemo = (launch: ScoredLaunch): LaunchInsightMemo => {
  const setupReasons = [];
  const riskReasons = [];

  if (launch.reasons.includes("LIQUIDITY_SURGED")) {
    setupReasons.push("liquidity is already above Jaguar's strength threshold");
  }
  if (launch.reasons.includes("VOLUME_ACCELERATED")) {
    setupReasons.push("recent flow is strong enough to keep attention on the pair");
  }
  if (launch.reasons.includes("BREAKOUT_CONFIRMED")) {
    setupReasons.push("price action is still supporting the breakout case");
  }
  if (launch.reasons.includes("MARKET_CAP_EXPANDING")) {
    setupReasons.push("market cap expansion is confirming broader interest");
  }

  if (launch.reasons.includes("DATA_TOO_SPARSE")) {
    riskReasons.push("GoldRush only has discovery-level data, so Jaguar is staying conservative");
  }
  if (launch.reasons.includes("LIQUIDITY_DROPPED")) {
    riskReasons.push("liquidity is still too thin for a safer entry");
  }
  if (launch.reasons.includes("VOLUME_STALLED")) {
    riskReasons.push("recent volume is not strong enough to trust follow-through");
  }
  if (launch.reasons.includes("BREAKOUT_FAILED")) {
    riskReasons.push("short-window price action is already breaking down");
  }
  if (launch.reasons.includes("VOLATILITY_TOO_HIGH")) {
    riskReasons.push("volatility is elevated enough to punish late entries");
  }
  if (launch.reasons.includes("SETUP_INVALIDATED")) {
    riskReasons.push("the setup has already crossed Jaguar's invalidation line");
  }

  if (setupReasons.length === 0) {
    setupReasons.push("the launch is still fresh enough for Jaguar to keep monitoring it");
  }
  if (riskReasons.length === 0) {
    riskReasons.push("conviction still depends on the next round of live pair updates");
  }

  return {
    bull: setupReasons.join(", "),
    bear: riskReasons.join(", "),
    verdict: `Decision is ${launch.verdict}. The live score is ${launch.score}, with ${launch.delta1m >= 0 ? "positive" : "negative"} 1 minute pressure, ${launch.delta5m >= 0 ? "positive" : "negative"} 5 minute flow, and ${launch.delta15m >= 0 ? "positive" : "negative"} 15 minute confirmation.`,
  };
};
