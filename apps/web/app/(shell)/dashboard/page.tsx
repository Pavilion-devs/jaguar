import {
  getConvictionWeekBuckets,
  getMissionControlSummary,
  getRecommendationScorecard,
  getWorkerHealth,
  listLaunchBoard,
} from "@jaguar/db";

import { ConvictionWeekChart } from "@/components/dashboard/conviction-week-chart";
import { PersonaSwitcher } from "@/components/dashboard/persona-switcher";
import { RecentCallsCard } from "@/components/dashboard/recent-calls-card";
import { ReminderCard } from "@/components/dashboard/reminder-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { WatchlistCard } from "@/components/dashboard/watchlist-card";
import { WinrateGauge } from "@/components/dashboard/winrate-gauge";
import { WorkerUptime } from "@/components/dashboard/worker-uptime";
import {
  launchPersonaVerdict,
  normalizePersona,
  personaDescription,
  personaLabel,
} from "@/lib/persona";

export const dynamic = "force-dynamic";

const TrendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Trend</title>
    <path
      d="M6 16V8M6 8l-3 3M6 8l3 3M14 5l6 6M14 5v14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Validated</title>
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Time</title>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Pulse</title>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" opacity={0.5} />
  </svg>
);

const averageMinutes = (values: number[]) => {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
};

const formatAgeMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m.toString().padStart(2, "0")}m`;
};

type PageProps = {
  searchParams?: Promise<{
    persona?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activePersona = normalizePersona(params?.persona);
  const [launches, summary, scorecard, buckets, worker] = await Promise.all([
    listLaunchBoard(60, activePersona),
    getMissionControlSummary(),
    getRecommendationScorecard(6, activePersona),
    getConvictionWeekBuckets(),
    getWorkerHealth(),
  ]);

  const convictionLaunches = launches.filter(
    (launch) => !launch.reasons.includes("DATA_TOO_SPARSE"),
  );
  const readyToEnter = launches.filter(
    (launch) => launchPersonaVerdict(launch, activePersona) === "enter",
  ).length;
  const openAges = scorecard.recentRecommendations
    .filter((r) => r.evaluationStatus === "pending")
    .map((r) => Math.max(0, Math.round((Date.now() - new Date(r.issuedAt).getTime()) / 60_000)));
  const avgOpenAge = averageMinutes(openAges);
  const latestCall = scorecard.recentRecommendations[0] ?? null;
  const winRateLine =
    scorecard.settledCount > 0
      ? `${scorecard.winRatePct.toFixed(1)}% of ${scorecard.settledCount} settled`
      : "No settled calls yet";

  return (
    <>
      <div className="page-head with-actions">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">
            Track every launch through the {personaLabel(activePersona)} lens.{" "}
            {personaDescription(activePersona)}
          </div>
        </div>
        <PersonaSwitcher activePersona={activePersona} basePath="/dashboard" />
      </div>

      <div className="dash-grid">
        <StatCard
          variant="stat-1"
          dark
          title="Total Launches"
          value={String(summary.trackedLaunches)}
          footIcon={<TrendIcon />}
          footText={`${summary.activeLaunches} refreshed in last 5m`}
        />
        <StatCard
          variant="stat-2"
          title="Calls Validated"
          value={String(scorecard.validatedCount)}
          footIcon={<CheckIcon />}
          footText={winRateLine}
        />
        <StatCard
          variant="stat-3"
          title="Open Calls"
          value={String(scorecard.openCount)}
          footIcon={<ClockIcon />}
          footText={
            scorecard.openCount > 0 && avgOpenAge > 0
              ? `Avg age ${formatAgeMinutes(avgOpenAge)}`
              : "None currently open"
          }
        />
        <StatCard
          variant="stat-4"
          title="Ready to Enter"
          value={String(readyToEnter)}
          footIcon={<PulseIcon />}
          footText={
            convictionLaunches.length === 0
              ? "Waiting on conviction-lane flow"
              : `${personaLabel(activePersona)} enter threshold`
          }
        />

        <ConvictionWeekChart buckets={buckets} />
        <ReminderCard latest={latestCall} persona={activePersona} />
        <WatchlistCard launches={convictionLaunches.slice(0, 5)} persona={activePersona} />
        <RecentCallsCard
          recommendations={scorecard.recentRecommendations}
          persona={activePersona}
        />
        <WinrateGauge
          percent={scorecard.settledCount === 0 ? 0 : scorecard.winRatePct}
          validatedCount={scorecard.validatedCount}
          openCount={scorecard.openCount}
          failedCount={scorecard.failedCount}
        />
        <WorkerUptime
          startedAt={worker?.startedAt ?? null}
          heartbeatAt={worker?.heartbeatAt ?? null}
        />
      </div>
    </>
  );
}
