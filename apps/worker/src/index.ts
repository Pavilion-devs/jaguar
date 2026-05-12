import { generateLaunchMemo } from "@jaguar/agent";
import {
  type IngestionApplyResult,
  applyLaunchUpdate,
  applyPairOhlcvCandle,
  applyTokenOhlcvCandle,
  getLatestAgentMemo,
  getLaunchDetail,
  listOhlcvCandidatePairAddresses,
  listOhlcvCandidateTokenAddresses,
  listTrackedPairAddresses,
  saveAgentMemo,
  upsertLaunchFromNewPair,
  upsertWorkerHeartbeat,
} from "@jaguar/db";
import {
  createGoldRushClient,
  subscribeToNewPairs,
  subscribeToPairOhlcvCandles,
  subscribeToTokenOhlcvCandles,
  subscribeToUpdatePairs,
} from "@jaguar/goldrush";

import { loadWorkerEnv } from "./env.js";

const MAX_TRACKED_PAIRS = 50;
const MAX_CANDLE_PAIRS = 12;
const MAX_CANDLE_TOKENS = 24;
const HEARTBEAT_INTERVAL_MS = 20_000;
const MIN_SUBSCRIPTION_REFRESH_MS = 15_000;
const STREAM_RECONNECT_DELAY_MS = 5_000;
const STREAM_IDLE_RECONNECT_MS = 10 * 60_000;
const ANALYST_COOLDOWN_MS = 10 * 60_000;
const ANALYST_STALE_SCORE_DRIFT = 8;
const MAX_ANALYST_QUEUE = 25;

const createSerialExecutor = () => {
  let current = Promise.resolve();

  return async <T>(task: () => Promise<T>) => {
    const nextTask = current.then(task);
    current = nextTask.then(
      () => undefined,
      () => undefined,
    );

    return nextTask;
  };
};

class AutonomousAnalyst {
  private readonly queue: IngestionApplyResult[] = [];
  private readonly recentlyQueuedAt = new Map<string, number>();
  private isProcessing = false;

  constructor(private readonly enabled = process.env.JAGUAR_AUTONOMOUS_ANALYST !== "false") {}

  consider(result: IngestionApplyResult) {
    if (
      !this.enabled ||
      result.duplicate ||
      !result.launchId ||
      result.analystTriggers.length === 0
    ) {
      return;
    }

    const now = Date.now();
    const previousQueuedAt = this.recentlyQueuedAt.get(result.launchId) ?? 0;
    if (now - previousQueuedAt < ANALYST_COOLDOWN_MS) {
      return;
    }

    this.recentlyQueuedAt.set(result.launchId, now);
    this.queue.push(result);

    if (this.queue.length > MAX_ANALYST_QUEUE) {
      this.queue.shift();
    }

    void this.drain();
  }

  private async drain() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      for (;;) {
        const next = this.queue.shift();
        if (!next) {
          return;
        }

        await this.generateMemo(next);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async generateMemo(result: IngestionApplyResult) {
    try {
      const detail = await getLaunchDetail(result.launchId);
      if (!detail) {
        return;
      }

      const latestMemo = await getLatestAgentMemo(result.launchId);
      const scoreDrift = latestMemo
        ? Math.abs(detail.launch.score - latestMemo.scoreAtMemo)
        : Number.POSITIVE_INFINITY;
      const hasDecisionTrigger = result.analystTriggers.some((trigger) =>
        [
          "discovery-graduated",
          "verdict-watch",
          "verdict-enter",
          "setup-invalidated",
          "paper-trade-opened",
        ].includes(trigger),
      );

      if (latestMemo && scoreDrift < ANALYST_STALE_SCORE_DRIFT && !hasDecisionTrigger) {
        return;
      }

      const memo = await generateLaunchMemo({
        launch: detail.launch,
        recentTimeline: detail.timeline,
      });

      await saveAgentMemo({
        launchId: result.launchId,
        scoreAtMemo: detail.launch.score,
        verdictAtMemo: detail.launch.verdict,
        reasonsAtMemo: detail.launch.reasons,
        bull: memo.bull,
        bear: memo.bear,
        verdict: memo.verdict,
        confidence: memo.confidence,
        modelUsed: memo.modelUsed,
        inputTokens: memo.inputTokens,
        outputTokens: memo.outputTokens,
        cacheReadTokens: memo.cacheReadTokens,
      });

      console.log(
        `[analyst] memo generated for ${result.pairAddress} after ${result.analystTriggers.join(", ")}`,
      );
    } catch (error) {
      console.error(
        `[analyst] memo generation failed for ${result.pairAddress}`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

class UpdateStreamCoordinator {
  private trackedPairAddresses: string[] = [];
  private candlePairAddresses: string[] = [];
  private candleTokenAddresses: string[] = [];
  private refreshTimer: NodeJS.Timeout | null = null;
  private disposeUpdateStream: (() => void) | null = null;
  private disposePairCandleStream: (() => void) | null = null;
  private disposeTokenCandleStream: (() => void) | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private idleWatchdogTimer: NodeJS.Timeout | null = null;
  private lastSubscriptionRefreshAt = 0;
  private lastStreamEventAt = Date.now();
  private activeSubscriptionVersion = 0;
  private isShuttingDown = false;

  constructor(
    private readonly client: ReturnType<typeof createGoldRushClient>,
    private readonly chainName: "SOLANA_MAINNET",
    private readonly runSerial: <T>(task: () => Promise<T>) => Promise<T>,
    private readonly autonomousAnalyst: AutonomousAnalyst,
  ) {}

  async seedFromDatabase() {
    const [existingPairAddresses, candleCandidatePairAddresses, candleCandidateTokenAddresses] =
      await Promise.all([
        listTrackedPairAddresses(MAX_TRACKED_PAIRS),
        listOhlcvCandidatePairAddresses(MAX_CANDLE_PAIRS),
        listOhlcvCandidateTokenAddresses(MAX_CANDLE_TOKENS),
      ]);

    for (const pairAddress of existingPairAddresses) {
      this.track(pairAddress, false);
    }

    for (const pairAddress of candleCandidatePairAddresses) {
      this.trackForCandles(pairAddress, false);
    }

    for (const tokenAddress of candleCandidateTokenAddresses) {
      this.trackTokenForCandles(tokenAddress, false);
    }

    this.refreshSubscription();
  }

  track(pairAddress: string, scheduleRefresh = true) {
    if (this.trackedPairAddresses.includes(pairAddress)) {
      this.trackedPairAddresses = [
        pairAddress,
        ...this.trackedPairAddresses.filter((value) => value !== pairAddress),
      ];
      return;
    }

    this.trackedPairAddresses = [pairAddress, ...this.trackedPairAddresses].slice(
      0,
      MAX_TRACKED_PAIRS,
    );

    if (scheduleRefresh) {
      this.scheduleRefresh();
    }
  }

  trackForCandles(pairAddress: string, scheduleRefresh = true) {
    if (this.candlePairAddresses.includes(pairAddress)) {
      this.candlePairAddresses = [
        pairAddress,
        ...this.candlePairAddresses.filter((value) => value !== pairAddress),
      ];
      return;
    }

    this.candlePairAddresses = [pairAddress, ...this.candlePairAddresses].slice(
      0,
      MAX_CANDLE_PAIRS,
    );

    if (scheduleRefresh) {
      this.scheduleRefresh();
    }
  }

  trackTokenForCandles(tokenAddress: string, scheduleRefresh = true) {
    if (!tokenAddress || tokenAddress === "UNKNOWN") {
      return;
    }

    if (this.candleTokenAddresses.includes(tokenAddress)) {
      this.candleTokenAddresses = [
        tokenAddress,
        ...this.candleTokenAddresses.filter((value) => value !== tokenAddress),
      ];
      return;
    }

    this.candleTokenAddresses = [tokenAddress, ...this.candleTokenAddresses].slice(
      0,
      MAX_CANDLE_TOKENS,
    );

    if (scheduleRefresh) {
      this.scheduleRefresh();
    }
  }

  snapshot() {
    return {
      trackedPairCount: this.trackedPairAddresses.length,
      pairCandleCandidateCount: this.candlePairAddresses.length,
      tokenCandleCandidateCount: this.candleTokenAddresses.length,
    };
  }

  isClosed() {
    return this.isShuttingDown;
  }

  private scheduleRefresh() {
    if (this.refreshTimer) {
      return;
    }

    const elapsedMs = Date.now() - this.lastSubscriptionRefreshAt;
    const delayMs = Math.max(300, MIN_SUBSCRIPTION_REFRESH_MS - elapsedMs);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refreshSubscription();
    }, delayMs);
  }

  private markStreamEvent() {
    this.lastStreamEventAt = Date.now();
  }

  private isStaleSubscriptionSignal(subscriptionVersion: number) {
    return this.isShuttingDown || subscriptionVersion !== this.activeSubscriptionVersion;
  }

  private scheduleReconnect(reason: string, subscriptionVersion: number) {
    if (this.isStaleSubscriptionSignal(subscriptionVersion) || this.reconnectTimer) {
      return;
    }

    console.warn(
      `${reason}; reconnecting tracked GoldRush streams in ${STREAM_RECONNECT_DELAY_MS}ms.`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isStaleSubscriptionSignal(subscriptionVersion)) {
        return;
      }
      this.refreshSubscription();
    }, STREAM_RECONNECT_DELAY_MS);
  }

  private startIdleWatchdog(subscriptionVersion: number) {
    if (this.idleWatchdogTimer) {
      clearInterval(this.idleWatchdogTimer);
    }

    const checkIntervalMs = Math.min(
      Math.max(Math.floor(STREAM_IDLE_RECONNECT_MS / 2), 30_000),
      60_000,
    );
    this.idleWatchdogTimer = setInterval(() => {
      if (
        this.isStaleSubscriptionSignal(subscriptionVersion) ||
        this.trackedPairAddresses.length === 0
      ) {
        return;
      }

      const idleMs = Date.now() - this.lastStreamEventAt;
      if (idleMs >= STREAM_IDLE_RECONNECT_MS) {
        this.scheduleReconnect(
          `Tracked GoldRush streams have been idle for ${Math.round(idleMs / 1000)}s`,
          subscriptionVersion,
        );
      }
    }, checkIntervalMs);
  }

  private refreshSubscription() {
    this.lastSubscriptionRefreshAt = Date.now();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.idleWatchdogTimer) {
      clearInterval(this.idleWatchdogTimer);
      this.idleWatchdogTimer = null;
    }

    const subscriptionVersion = this.activeSubscriptionVersion + 1;
    this.activeSubscriptionVersion = subscriptionVersion;
    const previousDispose = this.disposeUpdateStream;
    this.disposeUpdateStream = null;
    previousDispose?.();
    const previousPairCandleDispose = this.disposePairCandleStream;
    this.disposePairCandleStream = null;
    previousPairCandleDispose?.();
    const previousTokenCandleDispose = this.disposeTokenCandleStream;
    this.disposeTokenCandleStream = null;
    previousTokenCandleDispose?.();

    if (this.trackedPairAddresses.length === 0) {
      console.log("No tracked pairs yet. Waiting for newPairs events.");
      return;
    }

    this.lastStreamEventAt = Date.now();
    console.log(
      `Subscribing to updatePairs for ${this.trackedPairAddresses.length} live pair addresses.`,
    );

    this.startIdleWatchdog(subscriptionVersion);

    this.disposeUpdateStream = subscribeToUpdatePairs(
      this.client,
      this.chainName,
      this.trackedPairAddresses,
      {
        next: async (event) => {
          this.markStreamEvent();
          const result = await this.runSerial(() => applyLaunchUpdate(event));

          if (event.base_token?.contract_address) {
            this.trackTokenForCandles(event.base_token.contract_address);
          }

          if (
            (event.quote_rate_usd ?? 0) > 0 ||
            (event.liquidity ?? 0) > 0 ||
            (event.last_5m?.volume_usd?.current_value ?? 0) > 0 ||
            (event.last_1hr?.volume_usd?.current_value ?? 0) > 0 ||
            (event.last_5m?.swap_count?.current_value ?? 0) > 0 ||
            (event.last_1hr?.swap_count?.current_value ?? 0) > 0
          ) {
            this.trackForCandles(event.pair_address);
          }

          if (result.duplicate) {
            return;
          }

          this.autonomousAnalyst.consider(result);

          console.log(
            `[updatePairs] ${event.pair_address} -> ${result.verdict.toUpperCase()} (${result.score})`,
          );
        },
        error: (error) => {
          console.error("updatePairs subscription error", error);
          this.scheduleReconnect("updatePairs subscription error", subscriptionVersion);
        },
        complete: () => {
          if (this.isStaleSubscriptionSignal(subscriptionVersion)) {
            return;
          }
          console.warn("updatePairs subscription completed");
          this.scheduleReconnect("updatePairs subscription completed", subscriptionVersion);
        },
      },
    );

    if (this.candlePairAddresses.length > 0) {
      console.log(
        `Subscribing to ohlcvCandlesForPair for ${this.candlePairAddresses.length} candidate pair addresses.`,
      );

      this.disposePairCandleStream = subscribeToPairOhlcvCandles(
        this.client,
        this.chainName,
        this.candlePairAddresses,
        {
          interval: "ONE_MINUTE",
          timeframe: "ONE_HOUR",
          limit: 250,
        },
        {
          next: async (event) => {
            this.markStreamEvent();
            const result = await this.runSerial(() => applyPairOhlcvCandle(event));

            if (result.duplicate) {
              return;
            }

            this.autonomousAnalyst.consider(result);

            console.log(
              `[ohlcvCandlesForPair] ${event.pair_address} -> ${result.verdict.toUpperCase()} (${result.score})`,
            );
          },
          error: (error) => {
            console.error("ohlcvCandlesForPair subscription error", error);
            this.scheduleReconnect("ohlcvCandlesForPair subscription error", subscriptionVersion);
          },
          complete: () => {
            if (this.isStaleSubscriptionSignal(subscriptionVersion)) {
              return;
            }
            console.warn("ohlcvCandlesForPair subscription completed");
            this.scheduleReconnect(
              "ohlcvCandlesForPair subscription completed",
              subscriptionVersion,
            );
          },
        },
      );
    } else {
      console.log(
        "No OHLCV candidate pairs yet. Waiting for updatePairs signal before subscribing.",
      );
    }

    if (this.candleTokenAddresses.length > 0) {
      console.log(
        `Subscribing to ohlcvCandlesForToken for ${this.candleTokenAddresses.length} candidate token addresses.`,
      );

      this.disposeTokenCandleStream = subscribeToTokenOhlcvCandles(
        this.client,
        this.chainName,
        this.candleTokenAddresses,
        {
          interval: "ONE_MINUTE",
          timeframe: "ONE_HOUR",
          limit: 250,
        },
        {
          next: async (event) => {
            this.markStreamEvent();
            const result = await this.runSerial(() => applyTokenOhlcvCandle(event));

            if (result.duplicate) {
              return;
            }

            this.autonomousAnalyst.consider(result);

            console.log(
              `[ohlcvCandlesForToken] ${result.pairAddress} -> ${result.verdict.toUpperCase()} (${result.score})`,
            );
          },
          error: (error) => {
            console.error("ohlcvCandlesForToken subscription error", error);
            this.scheduleReconnect("ohlcvCandlesForToken subscription error", subscriptionVersion);
          },
          complete: () => {
            if (this.isStaleSubscriptionSignal(subscriptionVersion)) {
              return;
            }
            console.warn("ohlcvCandlesForToken subscription completed");
            this.scheduleReconnect(
              "ohlcvCandlesForToken subscription completed",
              subscriptionVersion,
            );
          },
        },
      );
    } else {
      console.log(
        "No OHLCV candidate tokens yet. Waiting for updatePairs signal before subscribing.",
      );
    }
  }

  close() {
    this.isShuttingDown = true;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.idleWatchdogTimer) {
      clearInterval(this.idleWatchdogTimer);
    }

    this.disposeUpdateStream?.();
    this.disposePairCandleStream?.();
    this.disposeTokenCandleStream?.();
  }
}

const main = async () => {
  const config = loadWorkerEnv();

  console.log("Jaguar worker booting");
  console.log("Stream URL:", config.streamUrl);
  console.log("Tracked protocols:", config.trackedProtocols.join(", "));

  if (!config.apiKey) {
    console.warn(
      "GOLDRUSH_API_KEY is missing. Worker scaffold is ready, but streaming is disabled.",
    );
    return;
  }

  const client = createGoldRushClient(config);
  const runSerial = createSerialExecutor();
  const autonomousAnalyst = new AutonomousAnalyst();
  const updateCoordinator = new UpdateStreamCoordinator(
    client,
    config.chainName,
    runSerial,
    autonomousAnalyst,
  );
  const workerStartedAt = new Date();
  const workerKey = `jaguar-worker-${config.chainName.toLowerCase()}`;

  await updateCoordinator.seedFromDatabase();

  const persistHeartbeat = async () => {
    const snapshot = updateCoordinator.snapshot();

    await runSerial(() =>
      upsertWorkerHeartbeat({
        workerKey,
        chainName: config.chainName,
        streamUrl: config.streamUrl,
        startedAt: workerStartedAt,
        heartbeatAt: new Date(),
        trackedProtocolCount: config.trackedProtocols.length,
        trackedPairCount: snapshot.trackedPairCount,
        pairCandleCandidateCount: snapshot.pairCandleCandidateCount,
        tokenCandleCandidateCount: snapshot.tokenCandleCandidateCount,
      }),
    );
  };

  await persistHeartbeat();
  const heartbeatTimer = setInterval(() => {
    void persistHeartbeat().catch((error: unknown) => {
      console.error("worker heartbeat failed", error);
    });
  }, HEARTBEAT_INTERVAL_MS);

  let disposeNewPairs: () => void = () => undefined;
  let newPairsReconnectTimer: NodeJS.Timeout | null = null;
  let newPairsIdleWatchdogTimer: NodeJS.Timeout | null = null;
  let newPairsSubscriptionVersion = 0;
  let lastNewPairEventAt = Date.now();

  const scheduleNewPairsReconnect = (reason: string, subscriptionVersion: number) => {
    if (
      subscriptionVersion !== newPairsSubscriptionVersion ||
      newPairsReconnectTimer ||
      updateCoordinator.isClosed()
    ) {
      return;
    }

    console.warn(`${reason}; reconnecting newPairs in ${STREAM_RECONNECT_DELAY_MS}ms.`);
    newPairsReconnectTimer = setTimeout(() => {
      newPairsReconnectTimer = null;
      if (subscriptionVersion !== newPairsSubscriptionVersion || updateCoordinator.isClosed()) {
        return;
      }
      subscribeNewPairsStream();
    }, STREAM_RECONNECT_DELAY_MS);
  };

  const startNewPairsIdleWatchdog = (subscriptionVersion: number) => {
    if (newPairsIdleWatchdogTimer) {
      clearInterval(newPairsIdleWatchdogTimer);
    }

    const checkIntervalMs = Math.min(
      Math.max(Math.floor(STREAM_IDLE_RECONNECT_MS / 2), 30_000),
      60_000,
    );
    newPairsIdleWatchdogTimer = setInterval(() => {
      if (subscriptionVersion !== newPairsSubscriptionVersion || updateCoordinator.isClosed()) {
        return;
      }

      const idleMs = Date.now() - lastNewPairEventAt;
      if (idleMs >= STREAM_IDLE_RECONNECT_MS) {
        scheduleNewPairsReconnect(
          `newPairs has been idle for ${Math.round(idleMs / 1000)}s`,
          subscriptionVersion,
        );
      }
    }, checkIntervalMs);
  };

  const subscribeNewPairsStream = () => {
    if (newPairsReconnectTimer) {
      clearTimeout(newPairsReconnectTimer);
      newPairsReconnectTimer = null;
    }

    const subscriptionVersion = newPairsSubscriptionVersion + 1;
    newPairsSubscriptionVersion = subscriptionVersion;
    lastNewPairEventAt = Date.now();
    disposeNewPairs();

    console.log("Subscribing to newPairs discovery stream.");
    startNewPairsIdleWatchdog(subscriptionVersion);

    disposeNewPairs = subscribeToNewPairs(client, config, {
      next: async (event) => {
        lastNewPairEventAt = Date.now();
        const result = await runSerial(() => upsertLaunchFromNewPair(event));

        updateCoordinator.track(result.pairAddress);
        if (event.base_token?.contract_address) {
          updateCoordinator.trackTokenForCandles(event.base_token.contract_address);
        }
        if ((event.quote_rate_usd ?? 0) > 0 || (event.liquidity ?? 0) > 0) {
          updateCoordinator.trackForCandles(result.pairAddress);
        }
        if (result.duplicate) {
          return;
        }
        autonomousAnalyst.consider(result);
        console.log(
          `[newPairs] ${result.pairAddress} -> ${result.verdict.toUpperCase()} (${result.score})`,
        );
      },
      error: (error) => {
        console.error("newPairs subscription error", error);
        scheduleNewPairsReconnect("newPairs subscription error", subscriptionVersion);
      },
      complete: () => {
        if (subscriptionVersion !== newPairsSubscriptionVersion || updateCoordinator.isClosed()) {
          return;
        }
        console.warn("newPairs subscription completed");
        scheduleNewPairsReconnect("newPairs subscription completed", subscriptionVersion);
      },
    });
  };

  subscribeNewPairsStream();

  const shutdown = () => {
    console.log("Shutting down Jaguar worker");
    clearInterval(heartbeatTimer);
    if (newPairsReconnectTimer) {
      clearTimeout(newPairsReconnectTimer);
    }
    if (newPairsIdleWatchdogTimer) {
      clearInterval(newPairsIdleWatchdogTimer);
    }
    disposeNewPairs();
    updateCoordinator.close();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(
    "GoldRush client initialized. Jaguar is now listening for real Solana newPairs, updatePairs, pair OHLCV, and token OHLCV data.",
  );

  await new Promise<void>(() => undefined);
};

main().catch((error: unknown) => {
  console.error("Jaguar worker failed to start", error);
  process.exitCode = 1;
});
