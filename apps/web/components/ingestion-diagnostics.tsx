import { formatRelativeTime, formatWholeNumber } from "@/lib/utils";

type IngestionStreamDiagnostics = {
  sourceStream: "newPairs" | "updatePairs" | "ohlcvCandlesForPair" | "ohlcvCandlesForToken";
  eventCount: number;
  lastEventAt: string | null;
};

type IngestionDiagnosticsProps = {
  diagnostics: {
    trackedPairCount: number;
    pairCandleCandidateCount: number;
    tokenCandleCandidateCount: number;
    pairCandleRows: number;
    tokenCandleRows: number;
    statesWithPairCandle: number;
    statesWithTokenCandle: number;
    statesUsingTokenFallback: number;
    workerHeartbeat: {
      workerKey: string;
      chainName: string;
      streamUrl: string;
      startedAt: string;
      heartbeatAt: string;
      trackedProtocolCount: number;
      trackedPairCount: number;
      pairCandleCandidateCount: number;
      tokenCandleCandidateCount: number;
    } | null;
    streams: IngestionStreamDiagnostics[];
  };
};

const sourceLabels: Record<IngestionStreamDiagnostics["sourceStream"], string> = {
  newPairs: "newPairs",
  updatePairs: "updatePairs",
  ohlcvCandlesForPair: "pair OHLCV",
  ohlcvCandlesForToken: "token OHLCV",
};

export function IngestionDiagnostics({ diagnostics }: IngestionDiagnosticsProps) {
  const tokenStream = diagnostics.streams.find(
    (stream) => stream.sourceStream === "ohlcvCandlesForToken",
  );
  const tokenFallbackLive =
    diagnostics.tokenCandleRows > 0 || diagnostics.statesUsingTokenFallback > 0;
  const workerHeartbeatAgeMs = diagnostics.workerHeartbeat
    ? Date.now() - new Date(diagnostics.workerHeartbeat.heartbeatAt).getTime()
    : Number.POSITIVE_INFINITY;
  const workerHealthLabel = diagnostics.workerHeartbeat
    ? workerHeartbeatAgeMs <= 45_000
      ? "Worker healthy"
      : workerHeartbeatAgeMs <= 120_000
        ? "Worker stale"
        : "Worker offline"
    : "No worker pulse";
  const workerHealthTone = diagnostics.workerHeartbeat
    ? workerHeartbeatAgeMs <= 45_000
      ? "text-primary"
      : workerHeartbeatAgeMs <= 120_000
        ? "text-amber-600"
        : "text-destructive"
    : "text-muted-foreground";

  return (
    <section className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-sm">
      <h2 className="text-base font-semibold">Ingestion diagnostics</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        Real delivery counts from persisted GoldRush events and current database-driven candidate
        selection. If token fallback starts landing, it will move here first.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Worker heartbeat
          </dt>
          <dd className={`mt-2 text-lg font-semibold ${workerHealthTone}`}>
            {diagnostics.workerHeartbeat
              ? formatRelativeTime(diagnostics.workerHeartbeat.heartbeatAt)
              : "Waiting"}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Worker status
          </dt>
          <dd className={`mt-2 text-lg font-semibold ${workerHealthTone}`}>{workerHealthLabel}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Tracked pairs
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.trackedPairCount)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Pair OHLCV candidates
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.pairCandleCandidateCount)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Token OHLCV candidates
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.tokenCandleCandidateCount)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Token fallback states
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.statesUsingTokenFallback)}
          </dd>
        </div>
      </dl>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Pair candle rows
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.pairCandleRows)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Token candle rows
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.tokenCandleRows)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            States with pair candles
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.statesWithPairCandle)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            States with token candles
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatWholeNumber(diagnostics.statesWithTokenCandle)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3">
        {diagnostics.streams.map((stream) => (
          <div
            key={stream.sourceStream}
            className="rounded-2xl border border-border bg-background/60 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{sourceLabels[stream.sourceStream]}</p>
              <span
                className={`text-xs ${stream.eventCount > 0 ? "text-primary" : "text-muted-foreground"}`}
              >
                {formatWholeNumber(stream.eventCount)} events
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {stream.lastEventAt
                ? `Last seen ${formatRelativeTime(stream.lastEventAt)}.`
                : "Waiting for first delivery."}
            </p>
          </div>
        ))}
      </div>

      {diagnostics.workerHeartbeat ? (
        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
          <p>
            {diagnostics.workerHeartbeat.workerKey} on {diagnostics.workerHeartbeat.chainName}{" "}
            started {formatRelativeTime(diagnostics.workerHeartbeat.startedAt)} and is currently
            holding {formatWholeNumber(diagnostics.workerHeartbeat.trackedProtocolCount)} tracked
            protocols, {formatWholeNumber(diagnostics.workerHeartbeat.trackedPairCount)} pair
            subscriptions, {formatWholeNumber(diagnostics.workerHeartbeat.pairCandleCandidateCount)}{" "}
            pair candle candidates, and{" "}
            {formatWholeNumber(diagnostics.workerHeartbeat.tokenCandleCandidateCount)} token candle
            candidates.
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {tokenFallbackLive
          ? `Token fallback is active with ${formatWholeNumber(diagnostics.tokenCandleRows)} stored token candles and ${formatWholeNumber(diagnostics.statesUsingTokenFallback)} launches currently leaning on token-only candle evidence.`
          : tokenStream?.eventCount
            ? "GoldRush has delivered token OHLCV events, but none are currently driving token-only fallback states."
            : "Token fallback is wired and subscribed, but GoldRush has not delivered a persisted token OHLCV candle in the current observation window yet."}
      </p>
    </section>
  );
}
