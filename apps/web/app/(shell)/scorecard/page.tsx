import Link from "next/link";

import { getRecommendationScorecard } from "@jaguar/db";

import { PersonaSwitcher } from "@/components/dashboard/persona-switcher";
import { StatCard } from "@/components/dashboard/stat-card";
import { WinrateGauge } from "@/components/dashboard/winrate-gauge";
import {
  normalizePersona,
  personaDescription,
  personaLabel,
  withPersonaParam,
} from "@/lib/persona";

export const dynamic = "force-dynamic";

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Calls</title>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Open</title>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Failed</title>
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
};

const formatPnl = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

type PageProps = {
  searchParams?: Promise<{
    persona?: string;
  }>;
};

export default async function ScorecardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activePersona = normalizePersona(params?.persona);
  const activePersonaLabel = personaLabel(activePersona);
  const scorecard = await getRecommendationScorecard(12, activePersona);

  return (
    <>
      <div className="page-head with-actions">
        <div>
          <h1>Scorecard</h1>
          <div className="sub">
            {activePersonaLabel} paper calls and outcomes. {personaDescription(activePersona)}
          </div>
        </div>
        <PersonaSwitcher activePersona={activePersona} basePath="/scorecard" />
      </div>

      <div className="dash-grid">
        <StatCard
          variant="stat-1"
          dark
          title="Calls issued"
          value={String(scorecard.totalIssued)}
          footIcon={<TargetIcon />}
          footText={`${activePersonaLabel} lens`}
        />
        <StatCard
          variant="stat-2"
          title="Validated"
          value={String(scorecard.validatedCount)}
          footIcon={<CheckIcon />}
          footText={`${scorecard.settledCount} settled total`}
        />
        <StatCard
          variant="stat-3"
          title="Open"
          value={String(scorecard.openCount)}
          footIcon={<ClockIcon />}
          footText="Live paper trades"
        />
        <StatCard
          variant="stat-4"
          title="Failed"
          value={String(scorecard.failedCount)}
          footIcon={<CrossIcon />}
          footText={`${scorecard.expiredCount} expired`}
        />

        <div className="c-gauge-wide">
          <WinrateGauge
            percent={scorecard.settledCount === 0 ? 0 : scorecard.winRatePct}
            validatedCount={scorecard.validatedCount}
            openCount={scorecard.openCount}
            failedCount={scorecard.failedCount}
          />
        </div>

        <div className="card c-calls-wide">
          <div className="list-head">
            <h3>Recent calls</h3>
            <span className="count-pill">{scorecard.recentRecommendations.length} shown</span>
          </div>
          {scorecard.recentRecommendations.length === 0 ? (
            <div className="empty-state">
              <strong>No calls yet</strong>
              Jaguar will publish paper-trade calls here as launches cross watch and enter
              thresholds on the conviction lane.
            </div>
          ) : (
            <div className="list-rows">
              {scorecard.recentRecommendations.map((rec) => {
                const outcome = rec.latestOutcome;
                const pnlClass = !outcome
                  ? "verdict-pill watch"
                  : outcome.priceChangePct >= 0
                    ? "verdict-pill enter"
                    : "verdict-pill ignore";
                return (
                  <Link
                    key={rec.id}
                    href={withPersonaParam(`/launches/${rec.launchId}`, activePersona)}
                    className="launch-row"
                  >
                    <div className="l-avatar">{rec.persona.slice(0, 2).toUpperCase()}</div>
                    <div className="l-body">
                      <div className="l-name">
                        {rec.persona.replace("-", " ")}
                        <span className="l-symbol">{rec.verdict}</span>
                      </div>
                      <div className="l-meta">
                        Entry ${rec.priceAtEntryUsd.toFixed(5)} · score {rec.scoreAtEntry} ·{" "}
                        {relativeTime(rec.issuedAt)}
                      </div>
                    </div>
                    <div className="l-metrics">
                      {outcome ? (
                        <span className={pnlClass}>{formatPnl(outcome.priceChangePct)}</span>
                      ) : (
                        <span className="verdict-pill watch">Awaiting window</span>
                      )}
                      <span
                        className={
                          rec.evaluationStatus === "validated"
                            ? "verdict-pill enter"
                            : rec.evaluationStatus === "failed"
                              ? "verdict-pill ignore"
                              : "verdict-pill watch"
                        }
                      >
                        {rec.evaluationStatus}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
