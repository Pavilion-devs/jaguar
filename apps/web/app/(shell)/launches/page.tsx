import { getMissionControlSummary, listLaunchBoard } from "@jaguar/db";

import { LaunchListCard } from "@/components/dashboard/launch-list-card";
import { PersonaSwitcher } from "@/components/dashboard/persona-switcher";
import { StatCard } from "@/components/dashboard/stat-card";
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

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Pulse</title>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" opacity={0.5} />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Time</title>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Spark</title>
    <path
      d="M12 3v4M12 17v4M4 12h4M16 12h4M6.3 6.3l2.9 2.9M14.8 14.8l2.9 2.9M6.3 17.7l2.9-2.9M14.8 9.2l2.9-2.9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

type PageProps = {
  searchParams?: Promise<{
    persona?: string;
  }>;
};

export default async function LaunchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activePersona = normalizePersona(params?.persona);
  const [launches, summary] = await Promise.all([
    listLaunchBoard(40, activePersona),
    getMissionControlSummary(),
  ]);

  const convictionLaunches = launches.filter(
    (launch) => !launch.reasons.includes("DATA_TOO_SPARSE"),
  );
  const discoveryLaunches = launches.filter((launch) => launch.reasons.includes("DATA_TOO_SPARSE"));
  const readyToEnter = launches.filter(
    (launch) => launchPersonaVerdict(launch, activePersona) === "enter",
  ).length;

  return (
    <>
      <div className="page-head with-actions">
        <div>
          <h1>Launches</h1>
          <div className="sub">
            Every tracked pair ranked for the {personaLabel(activePersona)} lens.{" "}
            {personaDescription(activePersona)}
          </div>
        </div>
        <PersonaSwitcher activePersona={activePersona} basePath="/launches" />
      </div>

      <div className="dash-grid">
        <StatCard
          variant="stat-1"
          dark
          title="Conviction lane"
          value={String(convictionLaunches.length)}
          footIcon={<TrendIcon />}
          footText="Scored with live flow data"
        />
        <StatCard
          variant="stat-2"
          title="Discovery lane"
          value={String(discoveryLaunches.length)}
          footIcon={<SparkIcon />}
          footText="Waiting on first real flow"
        />
        <StatCard
          variant="stat-3"
          title="Live now"
          value={String(summary.activeLaunches)}
          footIcon={<ClockIcon />}
          footText="Refreshed in the last 5 minutes"
        />
        <StatCard
          variant="stat-4"
          title="Ready to enter"
          value={String(readyToEnter)}
          footIcon={<PulseIcon />}
          footText={`${personaLabel(activePersona)} enter threshold`}
        />

        <LaunchListCard
          variant="c-conviction"
          title="Conviction lane"
          subtitle="Ranked by score, then longer-horizon conviction delta."
          launches={convictionLaunches.slice(0, 12)}
          countLabel={`${convictionLaunches.length} live`}
          persona={activePersona}
          emptyTitle="No conviction launches yet"
          emptyBody="GoldRush is discovering new pairs, but nothing has enough post-discovery flow to rank yet."
        />

        <LaunchListCard
          variant="c-discovery"
          title="Discovery lane"
          subtitle="Fresh pairs waiting on liquidity, volume, or swaps."
          launches={discoveryLaunches.slice(0, 10)}
          countLabel={`${discoveryLaunches.length} waiting`}
          persona={activePersona}
          muted
          emptyTitle="Discovery lane clear"
          emptyBody="No sparse-only launches waiting for follow-up data."
        />
      </div>
    </>
  );
}
