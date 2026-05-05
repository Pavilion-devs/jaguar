import { describe, expect, it } from "vitest";

import type { LaunchSnapshot, ReasonCode } from "@jaguar/domain";

import { buildLaunchMemo, scoreLaunch, scoreLaunchBoard } from "./index.js";

const baseSnapshot = (): LaunchSnapshot => ({
  id: "launch-1",
  tokenSymbol: "TEST",
  tokenName: "Test Token",
  protocol: "RAYDIUM_AMM",
  pairAddress: "pair-1",
  createdAt: "2026-04-24T10:00:00.000Z",
  lastEventAt: "2026-04-24T10:05:00.000Z",
  lastPairCandleAt: null,
  lastTokenCandleAt: null,
  ageMinutes: 10,
  liquidityUsd: 0,
  marketCapUsd: 0,
  quoteRateUsd: 0,
  volume1mUsd: 0,
  volume5mUsd: 0,
  volume15mUsd: 0,
  volume1hUsd: 0,
  priceChange1mPct: 0,
  priceChange5mPct: 0,
  priceChange15mPct: 0,
  priceChange1hPct: 0,
  swapCount5m: 0,
  swapCount1h: 0,
});

const withOverrides = (overrides: Partial<LaunchSnapshot>): LaunchSnapshot => ({
  ...baseSnapshot(),
  ...overrides,
});

const richSnapshot = (overrides: Partial<LaunchSnapshot> = {}): LaunchSnapshot =>
  withOverrides({
    liquidityUsd: 80_000,
    marketCapUsd: 400_000,
    quoteRateUsd: 0.01,
    volume1mUsd: 5_000,
    volume5mUsd: 30_000,
    volume15mUsd: 60_000,
    volume1hUsd: 120_000,
    priceChange1mPct: 5,
    priceChange5mPct: 10,
    priceChange15mPct: 14,
    priceChange1hPct: 18,
    swapCount5m: 30,
    swapCount1h: 180,
    ageMinutes: 8,
    ...overrides,
  });

describe("scoreLaunch - verdict thresholds", () => {
  it("maps a dead snapshot to ignore", () => {
    const result = scoreLaunch(baseSnapshot());
    expect(result.verdict).toBe("ignore");
    expect(result.score).toBeLessThan(30);
  });

  it("maps a rich snapshot to enter", () => {
    const result = scoreLaunch(richSnapshot());
    expect(result.verdict).toBe("enter");
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("clamps score to the 0-100 band", () => {
    const extreme = richSnapshot({
      liquidityUsd: 10_000_000,
      marketCapUsd: 50_000_000,
      volume1mUsd: 1_000_000,
      volume5mUsd: 10_000_000,
      volume15mUsd: 50_000_000,
      volume1hUsd: 100_000_000,
      priceChange1mPct: 50,
      priceChange5mPct: 90,
      priceChange15mPct: 140,
      priceChange1hPct: 200,
      swapCount5m: 5_000,
      swapCount1h: 50_000,
    });
    const result = scoreLaunch(extreme);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreLaunch - persona offsets", () => {
  it("degen is more permissive than momentum, which is more permissive than risk-first", () => {
    // Pick a snapshot whose base score straddles both thresholds after persona offsets.
    // momentum offset = 0, degen = +5, risk-first = -8
    // Target: base score ~34 so risk-first (26) = ignore, momentum/degen = watch
    const borderline = withOverrides({
      liquidityUsd: 18_000,
      volume5mUsd: 8_000,
      volume15mUsd: 15_000,
      priceChange5mPct: 3,
      swapCount5m: 6,
      swapCount1h: 25,
      ageMinutes: 12,
    });
    const result = scoreLaunch(borderline);
    // Sanity: score should land in the watch band for momentum.
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThan(60);
    expect(result.personaVerdicts.momentum).toBe("watch");
    // degen gets a +5 bump - still watch (or enter if very close to 60).
    expect(["watch", "enter"]).toContain(result.personaVerdicts.degen);
    // risk-first gets -8 - can drop to ignore near the low end.
    expect(["ignore", "watch"]).toContain(result.personaVerdicts["risk-first"]);
  });

  it("produces the same persona map keys for any input", () => {
    const result = scoreLaunch(baseSnapshot());
    expect(Object.keys(result.personaVerdicts).sort()).toEqual(
      ["degen", "momentum", "risk-first"].sort(),
    );
  });
});

describe("scoreLaunch - reason codes", () => {
  const hasReason = (reasons: ReasonCode[], code: ReasonCode) => reasons.includes(code);

  it("flags DATA_TOO_SPARSE on an empty snapshot", () => {
    const result = scoreLaunch(baseSnapshot());
    expect(hasReason(result.reasons, "DATA_TOO_SPARSE")).toBe(true);
  });

  it("does not flag DATA_TOO_SPARSE once any execution or momentum signal arrives", () => {
    const result = scoreLaunch(withOverrides({ swapCount5m: 2 }));
    expect(hasReason(result.reasons, "DATA_TOO_SPARSE")).toBe(false);
  });

  it("flags LIQUIDITY_SURGED at or above 50k", () => {
    const result = scoreLaunch(withOverrides({ liquidityUsd: 50_000, swapCount5m: 1 }));
    expect(hasReason(result.reasons, "LIQUIDITY_SURGED")).toBe(true);
  });

  it("flags LIQUIDITY_DROPPED below 10k - including zero-liquidity sparse launches (current behaviour)", () => {
    // This documents a known overlap: a sparse launch fires both DATA_TOO_SPARSE
    // and LIQUIDITY_DROPPED. Alert compression must treat sparse launches specially
    // so it does not emit "liquidity dropped" alerts for launches that never had any.
    const sparse = scoreLaunch(baseSnapshot());
    expect(hasReason(sparse.reasons, "DATA_TOO_SPARSE")).toBe(true);
    expect(hasReason(sparse.reasons, "LIQUIDITY_DROPPED")).toBe(true);
  });

  it("flags VOLUME_ACCELERATED when any single window crosses its trigger", () => {
    const result = scoreLaunch(withOverrides({ volume5mUsd: 20_000, swapCount5m: 1 }));
    expect(hasReason(result.reasons, "VOLUME_ACCELERATED")).toBe(true);
  });

  it("flags VOLUME_STALLED only when every short window is low", () => {
    const stalled = scoreLaunch(
      withOverrides({ liquidityUsd: 20_000, volume1mUsd: 100, volume5mUsd: 1_000 }),
    );
    expect(hasReason(stalled.reasons, "VOLUME_STALLED")).toBe(true);

    const moving = scoreLaunch(
      withOverrides({ liquidityUsd: 20_000, volume1mUsd: 100, volume5mUsd: 5_000 }),
    );
    expect(hasReason(moving.reasons, "VOLUME_STALLED")).toBe(false);
  });

  it("flags BREAKOUT_CONFIRMED on positive move and BREAKOUT_FAILED on symmetric drop", () => {
    const up = scoreLaunch(withOverrides({ priceChange5mPct: 10 }));
    expect(hasReason(up.reasons, "BREAKOUT_CONFIRMED")).toBe(true);
    expect(hasReason(up.reasons, "BREAKOUT_FAILED")).toBe(false);

    const down = scoreLaunch(withOverrides({ priceChange5mPct: -10 }));
    expect(hasReason(down.reasons, "BREAKOUT_FAILED")).toBe(true);
    expect(hasReason(down.reasons, "BREAKOUT_CONFIRMED")).toBe(false);
  });

  it("flags VOLATILITY_TOO_HIGH on large absolute moves in either direction", () => {
    const spike = scoreLaunch(withOverrides({ priceChange5mPct: 25 }));
    expect(hasReason(spike.reasons, "VOLATILITY_TOO_HIGH")).toBe(true);

    const crash = scoreLaunch(withOverrides({ priceChange5mPct: -25 }));
    expect(hasReason(crash.reasons, "VOLATILITY_TOO_HIGH")).toBe(true);
  });

  it("flags MARKET_CAP_EXPANDING above 250k", () => {
    const result = scoreLaunch(withOverrides({ marketCapUsd: 300_000, swapCount5m: 1 }));
    expect(hasReason(result.reasons, "MARKET_CAP_EXPANDING")).toBe(true);
  });

  it("flags SETUP_INVALIDATED on deeper drawdowns", () => {
    const result = scoreLaunch(withOverrides({ priceChange15mPct: -20 }));
    expect(hasReason(result.reasons, "SETUP_INVALIDATED")).toBe(true);
  });
});

describe("scoreLaunch - delta ranges", () => {
  it("clamps deltas to their documented bands", () => {
    const extreme = withOverrides({
      volume1mUsd: 10_000_000,
      volume5mUsd: 10_000_000,
      volume15mUsd: 10_000_000,
      volume1hUsd: 100_000_000,
      priceChange1mPct: 500,
      priceChange5mPct: 500,
      priceChange15mPct: 500,
      priceChange1hPct: 500,
    });
    const result = scoreLaunch(extreme);
    expect(result.delta1m).toBeLessThanOrEqual(20);
    expect(result.delta5m).toBeLessThanOrEqual(30);
    expect(result.delta15m).toBeLessThanOrEqual(35);
    expect(result.delta1h).toBeLessThanOrEqual(35);

    const negative = withOverrides({
      priceChange1mPct: -500,
      priceChange5mPct: -500,
      priceChange15mPct: -500,
      priceChange1hPct: -500,
    });
    const downResult = scoreLaunch(negative);
    expect(downResult.delta1m).toBeGreaterThanOrEqual(-20);
    expect(downResult.delta5m).toBeGreaterThanOrEqual(-30);
    expect(downResult.delta15m).toBeGreaterThanOrEqual(-35);
    expect(downResult.delta1h).toBeGreaterThanOrEqual(-35);
  });
});

describe("scoreLaunch - live data patterns", () => {
  it("keeps zero-liquidity high-flow launches in watch instead of enter", () => {
    // Mirrors the live HORSE-style pattern: strong 5m flow and swaps, but
    // GoldRush reports $0 liquidity. Jaguar should watch it, not call entry.
    const result = scoreLaunch(
      withOverrides({
        id: "zero-liquidity-high-flow",
        tokenSymbol: "HORSE",
        tokenName: "my daughter's drawing",
        liquidityUsd: 0,
        marketCapUsd: 11_800,
        quoteRateUsd: 0.000012,
        volume5mUsd: 41_260,
        volume1hUsd: 52_748,
        priceChange5mPct: 6.63,
        priceChange1hPct: -3.35,
        swapCount5m: 340,
        swapCount1h: 451,
        ageMinutes: 3_180,
      }),
    );

    expect(result.verdict).toBe("watch");
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThan(60);
    expect(result.reasons).toContain("LIQUIDITY_DROPPED");
    expect(result.reasons).toContain("VOLUME_ACCELERATED");
    expect(result.reasons).not.toContain("DATA_TOO_SPARSE");
  });

  it("keeps quote-only launches in ignore until execution data arrives", () => {
    const result = scoreLaunch(
      withOverrides({
        id: "quote-only",
        tokenSymbol: "QUOTE",
        quoteRateUsd: 0.0000042,
        marketCapUsd: 500,
      }),
    );

    expect(result.verdict).toBe("ignore");
    expect(result.score).toBeLessThan(30);
    expect(result.reasons).toContain("LIQUIDITY_DROPPED");
    expect(result.reasons).toContain("VOLUME_STALLED");
  });

  it("marks sharp rollovers as invalidated even when earlier flow was active", () => {
    const result = scoreLaunch(
      withOverrides({
        id: "sharp-rollover",
        tokenSymbol: "ROLL",
        liquidityUsd: 18_000,
        marketCapUsd: 120_000,
        quoteRateUsd: 0.00008,
        volume5mUsd: 9_000,
        volume15mUsd: 20_000,
        volume1hUsd: 30_000,
        priceChange1mPct: -5,
        priceChange5mPct: -21,
        priceChange15mPct: -29,
        priceChange1hPct: -22,
        swapCount5m: 25,
        swapCount1h: 120,
      }),
    );

    expect(result.verdict).not.toBe("enter");
    expect(result.reasons).toContain("BREAKOUT_FAILED");
    expect(result.reasons).toContain("VOLATILITY_TOO_HIGH");
    expect(result.reasons).toContain("SETUP_INVALIDATED");
    expect(result.delta5m).toBeLessThan(0);
    expect(result.delta15m).toBeLessThan(0);
  });

  it("lets degen watch a low-band setup while risk-first ignores it", () => {
    const result = scoreLaunch(
      withOverrides({
        id: "persona-split",
        tokenSymbol: "SPLIT",
        liquidityUsd: 8_000,
        marketCapUsd: 15_000,
        quoteRateUsd: 0.00002,
        volume5mUsd: 2_500,
        volume15mUsd: 3_000,
        priceChange5mPct: 0.5,
        swapCount5m: 2,
        swapCount1h: 8,
        ageMinutes: 100,
      }),
    );

    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(35);
    expect(result.personaVerdicts.degen).toBe("watch");
    expect(result.personaVerdicts["risk-first"]).toBe("ignore");
  });
});

describe("scoreLaunchBoard", () => {
  it("sorts by score desc, then by longer-horizon deltas, then by recency", () => {
    const strong = richSnapshot({ id: "strong", pairAddress: "pair-strong" });
    const mediumNewer = withOverrides({
      id: "medium-newer",
      pairAddress: "pair-medium-newer",
      liquidityUsd: 25_000,
      volume5mUsd: 10_000,
      priceChange5mPct: 3,
      swapCount5m: 8,
      lastEventAt: "2026-04-24T10:09:00.000Z",
    });
    const mediumOlder = withOverrides({
      id: "medium-older",
      pairAddress: "pair-medium-older",
      liquidityUsd: 25_000,
      volume5mUsd: 10_000,
      priceChange5mPct: 3,
      swapCount5m: 8,
      lastEventAt: "2026-04-24T10:01:00.000Z",
    });

    const sorted = scoreLaunchBoard([mediumOlder, mediumNewer, strong]);
    expect(sorted.map((launch) => launch.id)).toEqual(["strong", "medium-newer", "medium-older"]);
  });
});

describe("buildLaunchMemo", () => {
  it("always returns non-empty bull and bear strings, even on a sparse launch", () => {
    const memo = buildLaunchMemo(scoreLaunch(baseSnapshot()));
    expect(memo.bull.length).toBeGreaterThan(0);
    expect(memo.bear.length).toBeGreaterThan(0);
    expect(memo.verdict).toMatch(/ignore|watch|enter/);
  });

  it("names the live verdict in the verdict sentence", () => {
    const rich = scoreLaunch(richSnapshot());
    const memo = buildLaunchMemo(rich);
    expect(memo.verdict).toContain(rich.verdict);
  });

  it("mentions the sparse-data caveat when data is sparse", () => {
    const memo = buildLaunchMemo(scoreLaunch(baseSnapshot()));
    expect(memo.bear.toLowerCase()).toContain("discovery");
  });
});
