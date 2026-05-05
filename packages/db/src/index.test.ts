import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { GoldRushNewPairEvent, GoldRushUpdatePairEvent } from "@jaguar/domain";

let db: typeof import("./index.js");
const execFileAsync = promisify(execFile);

const testDbPath = resolve(
  process.cwd(),
  "../../tmp/db-tests",
  `jaguar-db-${process.pid}-${Date.now()}.db`,
);

const testDatabaseUrl = `file:${testDbPath}`;

const token = (symbol: string, address = `${symbol.toLowerCase()}-mint`) => ({
  contract_name: `${symbol} Token`,
  contract_address: address,
  contract_decimals: 6,
  contract_ticker_symbol: symbol,
});

const baseNewPairEvent = (overrides: Partial<GoldRushNewPairEvent> = {}): GoldRushNewPairEvent => ({
  chain_name: "SOLANA_MAINNET",
  protocol: "PUMP_FUN",
  protocol_version: "v1",
  pair_address: "pair-regression-1",
  pair: token("PAIR", "pair-regression-1"),
  base_token: token("REG", "regression-token"),
  quote_token: token("SOL", "sol-quote-token"),
  block_signed_at: "2026-04-28T10:00:00.000Z",
  liquidity: 25_000,
  market_cap: 80_000,
  quote_rate: 0.00001,
  quote_rate_usd: 0.00001,
  tx_hash: "new-pair-tx",
  event_name: "pair_created",
  deployer_address: "deployer-1",
  ...overrides,
});

const updateEvent = (
  overrides: Partial<GoldRushUpdatePairEvent> = {},
): GoldRushUpdatePairEvent => ({
  chain_name: "SOLANA_MAINNET",
  pair_address: "pair-regression-1",
  timestamp: "2026-04-28T10:01:00.000Z",
  quote_rate: 0.00002,
  quote_rate_usd: 0.00002,
  liquidity: 30_000,
  market_cap: 90_000,
  base_token: token("REG", "regression-token"),
  quote_token: token("SOL", "sol-quote-token"),
  last_5m: {
    price: {
      current_value: 0.00002,
      previous_value: 0.000018,
      pct_change: 11.1,
    },
    swap_count: {
      current_value: 44,
      previous_value: 20,
      pct_change: 120,
    },
    volume_usd: {
      current_value: 12_500,
      previous_value: 4_000,
      pct_change: 212.5,
    },
  },
  last_1hr: {
    price: {
      current_value: 0.00002,
      previous_value: 0.000015,
      pct_change: 33.3,
    },
    swap_count: {
      current_value: 121,
      previous_value: 60,
      pct_change: 101.6,
    },
    volume_usd: {
      current_value: 44_000,
      previous_value: 20_000,
      pct_change: 120,
    },
  },
  ...overrides,
});

beforeAll(async () => {
  mkdirSync(dirname(testDbPath), { recursive: true });
  process.env.DATABASE_URL = testDatabaseUrl;

  await execFileAsync(
    "pnpm",
    [
      "--filter",
      "@jaguar/db",
      "exec",
      "prisma",
      "db",
      "push",
      "--schema",
      "./prisma/schema.prisma",
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    },
  );

  db = await import("./index.js");
});

beforeEach(async () => {
  await db.prisma.recommendationOutcome.deleteMany();
  await db.prisma.recommendation.deleteMany();
  await db.prisma.launchMemo.deleteMany();
  await db.prisma.alert.deleteMany();
  await db.prisma.launchTimeline.deleteMany();
  await db.prisma.launchTokenCandle.deleteMany();
  await db.prisma.launchPairCandle.deleteMany();
  await db.prisma.launchEvent.deleteMany();
  await db.prisma.launchState.deleteMany();
  await db.prisma.launch.deleteMany();
});

afterAll(async () => {
  await db?.prisma.$disconnect();
  rmSync(testDbPath, { force: true });
});

describe("applyLaunchUpdate ingestion regressions", () => {
  it("persists distinct same-timestamp updatePairs payloads instead of dropping them as duplicates", async () => {
    await db.upsertLaunchFromNewPair(baseNewPairEvent());

    const first = await db.applyLaunchUpdate(updateEvent());
    const second = await db.applyLaunchUpdate(
      updateEvent({
        quote_rate: 0.00003,
        quote_rate_usd: 0.00003,
        last_5m: {
          price: {
            current_value: 0.00003,
            previous_value: 0.00002,
            pct_change: 50,
          },
          swap_count: {
            current_value: 61,
            previous_value: 44,
            pct_change: 38.6,
          },
          volume_usd: {
            current_value: 18_000,
            previous_value: 12_500,
            pct_change: 44,
          },
        },
      }),
    );

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);

    const events = await db.prisma.launchEvent.findMany({
      where: {
        sourceStream: "updatePairs",
        eventType: "pair_updated",
      },
      orderBy: {
        ingestedAt: "asc",
      },
    });

    expect(events).toHaveLength(2);
    expect(new Set(events.map((event) => event.eventTime.toISOString())).size).toBe(1);
    expect(new Set(events.map((event) => event.payloadJson)).size).toBe(2);

    const state = await db.prisma.launchState.findFirstOrThrow();
    expect(state.currentQuoteRateUsd).toBe(0.00003);
    expect(state.currentVolume5mUsd).toBe(18_000);
    expect(state.currentSwapCount5m).toBe(61);
  });

  it("does not overwrite stored swap, volume, liquidity, or market cap values when updatePairs omits partial metrics", async () => {
    await db.upsertLaunchFromNewPair(
      baseNewPairEvent({
        pair_address: "pair-regression-2",
        base_token: token("PAR", "partial-token"),
      }),
    );

    await db.applyLaunchUpdate(
      updateEvent({
        pair_address: "pair-regression-2",
        base_token: token("PAR", "partial-token"),
        liquidity: 42_000,
        market_cap: 111_000,
        last_5m: {
          swap_count: {
            current_value: 77,
          },
          volume_usd: {
            current_value: 22_000,
          },
          price: {
            pct_change: 7,
          },
        },
        last_1hr: {
          swap_count: {
            current_value: 199,
          },
          volume_usd: {
            current_value: 80_000,
          },
          price: {
            pct_change: 13,
          },
        },
      }),
    );

    const beforePartial = await db.prisma.launchState.findFirstOrThrow();
    expect(beforePartial.currentLiquidityUsd).toBe(42_000);
    expect(beforePartial.currentMarketCapUsd).toBe(111_000);
    expect(beforePartial.currentVolume5mUsd).toBe(22_000);
    expect(beforePartial.currentVolume1hUsd).toBe(80_000);
    expect(beforePartial.currentSwapCount5m).toBe(77);
    expect(beforePartial.currentSwapCount1h).toBe(199);

    const partial = await db.applyLaunchUpdate(
      updateEvent({
        pair_address: "pair-regression-2",
        timestamp: "2026-04-28T10:02:00.000Z",
        quote_rate: 0.00004,
        quote_rate_usd: 0.00004,
        liquidity: undefined,
        market_cap: undefined,
        base_token: token("PAR", "partial-token"),
        last_5m: {
          price: {
            pct_change: 9,
          },
        },
        last_1hr: null,
      }),
    );

    expect(partial.duplicate).toBe(false);

    const afterPartial = await db.prisma.launchState.findFirstOrThrow();
    expect(afterPartial.currentLiquidityUsd).toBe(42_000);
    expect(afterPartial.currentMarketCapUsd).toBe(111_000);
    expect(afterPartial.currentVolume5mUsd).toBe(22_000);
    expect(afterPartial.currentVolume1hUsd).toBe(80_000);
    expect(afterPartial.currentSwapCount5m).toBe(77);
    expect(afterPartial.currentSwapCount1h).toBe(199);
    expect(afterPartial.priceChange5mPct).toBe(9);
    expect(afterPartial.currentQuoteRateUsd).toBe(0.00004);
  });

  it("still treats an identical same-timestamp updatePairs payload as duplicate", async () => {
    await db.upsertLaunchFromNewPair(
      baseNewPairEvent({
        pair_address: "pair-regression-3",
        base_token: token("DUP", "duplicate-token"),
      }),
    );

    const event = updateEvent({
      pair_address: "pair-regression-3",
      base_token: token("DUP", "duplicate-token"),
    });

    const first = await db.applyLaunchUpdate(event);
    const second = await db.applyLaunchUpdate(event);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);

    const events = await db.prisma.launchEvent.findMany({
      where: {
        sourceStream: "updatePairs",
        eventType: "pair_updated",
      },
    });

    expect(events).toHaveLength(1);
  });
});
