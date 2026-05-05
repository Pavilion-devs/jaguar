"use client";

import { Pause, Play, Radar, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { formatRelativeTime } from "@/lib/utils";

type LiveBoardToolbarProps = {
  boardUpdatedAt: string | null;
  trackedLaunchCount: number;
  rawEventCount: number;
};

const AUTO_REFRESH_MS = 15_000;

export function LiveBoardToolbar({
  boardUpdatedAt,
  trackedLaunchCount,
  rawEventCount,
}: LiveBoardToolbarProps) {
  const router = useRouter();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mountedAt] = useState(() => Date.now());
  const [lastRequestedAt, setLastRequestedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const lastSyncedAt = boardUpdatedAt ? new Date(boardUpdatedAt).getTime() : 0;
  const refreshAnchor = Math.max(lastSyncedAt, lastRequestedAt, mountedAt);
  const millisecondsUntilRefresh = AUTO_REFRESH_MS - (now - refreshAnchor);
  const secondsUntilRefresh = Math.max(0, Math.ceil(millisecondsUntilRefresh / 1_000));

  useEffect(() => {
    if (!autoRefresh || isPending) {
      return;
    }

    if (now - refreshAnchor < AUTO_REFRESH_MS) {
      return;
    }

    if (document.visibilityState !== "visible") {
      return;
    }

    const requestStartedAt = Date.now();
    setLastRequestedAt(requestStartedAt);

    startTransition(() => {
      router.refresh();
    });
  }, [autoRefresh, isPending, now, refreshAnchor, router]);

  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-10 items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 text-xs font-medium text-primary">
          <span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" />
          Live sync
        </span>

        <button
          type="button"
          onClick={() => {
            const requestStartedAt = Date.now();
            setLastRequestedAt(requestStartedAt);

            startTransition(() => {
              router.refresh();
            });
          }}
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh now
        </button>

        <button
          type="button"
          onClick={() => setAutoRefresh((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {autoRefresh ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {autoRefresh ? "Pause auto" : "Resume auto"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Radar className="h-3.5 w-3.5" aria-hidden="true" />
          {trackedLaunchCount} tracked launches
        </span>
        <span>{rawEventCount} raw events persisted</span>
        <span>
          {boardUpdatedAt
            ? `Last sync ${formatRelativeTime(boardUpdatedAt, now)}`
            : "Waiting for first live sync"}
        </span>
        <span>
          {autoRefresh ? `Next refresh in ${secondsUntilRefresh}s` : "Auto refresh paused"}
        </span>
      </div>
    </div>
  );
}
