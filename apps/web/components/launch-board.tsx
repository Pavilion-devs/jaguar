"use client";

import { ArrowUpRight, Clock3, Flame, Radio, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { ScoredLaunch, Verdict } from "@jaguar/domain";

import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import {
  formatCompactCurrency,
  formatPercent,
  formatProtocolLabel,
  formatRelativeTime,
  formatUsdPrice,
} from "@/lib/utils";

type LaunchBoardProps = {
  launches: ScoredLaunch[];
  mode?: "conviction" | "discovery";
  showFilters?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  maxItems?: number;
};

type BoardFilter = "all" | Verdict;

const FILTERS: BoardFilter[] = ["all", "enter", "watch", "ignore"];

export function LaunchBoard({
  launches,
  mode = "conviction",
  showFilters = true,
  emptyStateTitle = "No launches yet",
  emptyStateDescription = "Once the worker starts ingesting new Solana pairs, Jaguar will rank them here.",
  maxItems,
}: LaunchBoardProps) {
  const [activeFilter, setActiveFilter] = useState<BoardFilter>("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const scopedLaunches = typeof maxItems === "number" ? launches.slice(0, maxItems) : launches;
  const visibleLaunches = showFilters
    ? activeFilter === "all"
      ? scopedLaunches
      : scopedLaunches.filter((launch) => launch.verdict === activeFilter)
    : scopedLaunches;

  if (launches.length === 0) {
    return <EmptyState title={emptyStateTitle} description={emptyStateDescription} />;
  }

  return (
    <div className="space-y-4">
      {showFilters ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const count =
                filter === "all"
                  ? scopedLaunches.length
                  : scopedLaunches.filter((launch) => launch.verdict === filter).length;
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-card-foreground hover:bg-card/80"
                  }`}
                >
                  <span className="capitalize">{filter}</span>
                  <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {visibleLaunches.length} of {scopedLaunches.length} launches ranked by
            conviction.
          </p>
        </div>
      ) : null}

      {visibleLaunches.length > 0 ? (
        <div className="grid gap-3">
          {visibleLaunches.map((launch) => (
            <Link
              key={launch.id}
              href={`/launches/${launch.id}`}
              className="group rounded-3xl border border-border bg-background/60 p-4 transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill verdict={launch.verdict} />
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                      {mode === "conviction" ? "Flow confirmed" : "Discovery only"}
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                      {formatProtocolLabel(launch.protocol)}
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {launch.ageMinutes}m old
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                      Updated {formatRelativeTime(launch.lastEventAt, now)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{launch.tokenName}</h3>
                      <span className="font-mono text-sm text-muted-foreground">
                        ${launch.tokenSymbol}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">
                      {mode === "conviction"
                        ? `Reasons: ${
                            launch.reasons.length > 0
                              ? launch.reasons.slice(0, 3).join(", ")
                              : "Awaiting stronger pair updates"
                          }`
                        : launch.quoteRateUsd > 0 || launch.marketCapUsd > 0
                          ? `Discovery-only data so far. Quote ${formatUsdPrice(launch.quoteRateUsd)} and market cap ${formatCompactCurrency(launch.marketCapUsd)}.`
                          : "Discovery-only data so far. Jaguar is waiting for the first real liquidity, volume, or swap update."}
                    </p>
                  </div>
                </div>

                {mode === "conviction" ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <BoardStat label="Score" value={String(launch.score)} />
                    <BoardStat
                      label="Liquidity"
                      value={formatCompactCurrency(launch.liquidityUsd)}
                      icon={Waves}
                    />
                    <BoardStat
                      label="Volume 1m"
                      value={formatCompactCurrency(launch.volume1mUsd)}
                      icon={ArrowUpRight}
                    />
                    <BoardStat
                      label="Volume 15m"
                      value={formatCompactCurrency(launch.volume15mUsd)}
                      icon={Flame}
                    />
                    <BoardStat
                      label="Delta 1m"
                      value={formatPercent(launch.delta1m)}
                      tone={
                        launch.delta1m > 0
                          ? "positive"
                          : launch.delta1m < 0
                            ? "negative"
                            : "neutral"
                      }
                    />
                    <BoardStat
                      label="Delta 5m"
                      value={formatPercent(launch.delta5m)}
                      tone={
                        launch.delta5m > 0
                          ? "positive"
                          : launch.delta5m < 0
                            ? "negative"
                            : "neutral"
                      }
                    />
                    <BoardStat
                      label="Delta 15m"
                      value={formatPercent(launch.delta15m)}
                      tone={
                        launch.delta15m > 0
                          ? "positive"
                          : launch.delta15m < 0
                            ? "negative"
                            : "neutral"
                      }
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <BoardStat
                      label="Quote"
                      value={formatUsdPrice(launch.quoteRateUsd)}
                      icon={Waves}
                    />
                    <BoardStat
                      label="Market cap"
                      value={formatCompactCurrency(launch.marketCapUsd)}
                      icon={Flame}
                    />
                    <BoardStat label="Score" value={String(launch.score)} />
                    <BoardStat label="Delta 1m" value={formatPercent(launch.delta1m)} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={showFilters ? `No ${activeFilter} launches right now` : emptyStateTitle}
          description={
            showFilters
              ? "Jaguar is ingesting live launches, but none currently match this verdict filter."
              : emptyStateDescription
          }
        />
      )}
    </div>
  );
}

type BoardStatProps = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "positive" | "negative" | "neutral";
};

const toneStyles: Record<NonNullable<BoardStatProps["tone"]>, string> = {
  positive: "text-emerald-700 dark:text-emerald-300",
  negative: "text-rose-700 dark:text-rose-300",
  neutral: "text-card-foreground",
};

function BoardStat({ label, value, icon: Icon, tone = "neutral" }: BoardStatProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden={true} /> : null}
        <span>{label}</span>
      </div>
      <p className={`mt-2 font-mono text-sm font-medium tabular-nums ${toneStyles[tone]}`}>
        {value}
      </p>
    </div>
  );
}
