import Link from "next/link";

import { getAlertDigest } from "@jaguar/db";
import type { AlertType } from "@jaguar/domain";

import { AlertsTabView } from "@/components/dashboard/alerts-tab-view";
import { PersonaSwitcher } from "@/components/dashboard/persona-switcher";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  normalizePersona,
  personaDescription,
  personaLabel,
  withPersonaParam,
} from "@/lib/persona";

export const dynamic = "force-dynamic";

const BUCKET_LABELS: Record<AlertType, string> = {
  "verdict-crossing": "Verdict crossings",
  "paper-trade-opened": "Paper trades opened",
  "paper-trade-settled": "Paper trades settled",
  "setup-invalidated": "Setups invalidated",
  "breakout-failed": "Breakouts failed",
  "liquidity-surge": "Liquidity surges",
  "discovery-graduated": "Graduations",
};

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Alerts</title>
    <path
      d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Pulse</title>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" opacity={0.5} />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Compressed</title>
    <path
      d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
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

type PageProps = {
  searchParams?: Promise<{
    persona?: string;
  }>;
};

const alertMatchesPersona = (text: string, personaLabelValue: string) =>
  text.toLowerCase().includes(personaLabelValue.toLowerCase());

export default async function AlertsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activePersona = normalizePersona(params?.persona);
  const activePersonaLabel = personaLabel(activePersona);
  const digest = await getAlertDigest({ windowMinutes: 60, recentLimit: 20 });
  const recent = [...digest.recent].sort((left, right) => {
    const leftMatch = alertMatchesPersona(`${left.title} ${left.body}`, activePersona);
    const rightMatch = alertMatchesPersona(`${right.title} ${right.body}`, activePersona);
    if (leftMatch !== rightMatch) return leftMatch ? -1 : 1;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const criticalCount = digest.buckets.filter((b) => b.severity === "critical").length;
  const warnCount = digest.buckets.filter((b) => b.severity === "warn").length;

  return (
    <AlertsTabView>
      <div className="page-head with-actions">
        <div>
          <h1>Alerts</h1>
          <div className="sub">
            Threshold events with {activePersonaLabel} calls lifted first.{" "}
            {personaDescription(activePersona)}
          </div>
        </div>
        <PersonaSwitcher activePersona={activePersona} basePath="/alerts" />
      </div>

      <div className="dash-grid">
        <StatCard
          variant="stat-1"
          dark
          title="Total in last hour"
          value={String(digest.totalAlerts)}
          footIcon={<BellIcon />}
          footText={`${digest.windowMinutes} minute window`}
        />
        <StatCard
          variant="stat-2"
          title="Critical"
          value={String(criticalCount)}
          footIcon={<ShieldIcon />}
          footText="Invalidations, breakout failures"
        />
        <StatCard
          variant="stat-3"
          title="Warn"
          value={String(warnCount)}
          footIcon={<PulseIcon />}
          footText="Verdict crossings, surges"
        />
        <StatCard
          variant="stat-4"
          title="Buckets"
          value={String(digest.buckets.length)}
          footIcon={<BellIcon />}
          footText="Distinct alert types seen"
        />

        <div className="card c-digest">
          <div className="list-head">
            <h3>By type</h3>
            <span className="count-pill muted">{digest.windowMinutes}m window</span>
          </div>
          {digest.buckets.length === 0 ? (
            <div className="empty-state">
              <strong>No buckets yet</strong>
              Nothing crossed a Jaguar threshold in the last hour.
            </div>
          ) : (
            <div className="bucket-list">
              {digest.buckets.map((bucket) => {
                const bucketClass =
                  bucket.severity === "critical"
                    ? "bucket-row critical"
                    : bucket.severity === "warn"
                      ? "bucket-row warn"
                      : "bucket-row";
                return (
                  <div key={bucket.alertType} className={bucketClass}>
                    <span className="bucket-label">{BUCKET_LABELS[bucket.alertType]}</span>
                    <span className="bucket-count">{bucket.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card c-alert-list">
          <div className="list-head">
            <h3>Recent alerts</h3>
            <span className={recent.length > 0 ? "count-pill" : "count-pill muted"}>
              {recent.length} shown
            </span>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state">
              <strong>All quiet</strong>
              Nothing crossed a Jaguar threshold recently. The list will populate the moment a
              conviction-lane launch changes verdict, opens a paper trade, surges liquidity, or gets
              invalidated.
            </div>
          ) : (
            <div className="list-rows">
              {recent.map((alert) => {
                const isPersonaMatch = alertMatchesPersona(
                  `${alert.title} ${alert.body}`,
                  activePersona,
                );
                const toneClass =
                  alert.severity === "critical"
                    ? "verdict-pill ignore"
                    : alert.severity === "warn"
                      ? "verdict-pill watch"
                      : "verdict-pill enter";
                return (
                  <Link
                    key={alert.id}
                    href={withPersonaParam(`/launches/${alert.launchId}`, activePersona)}
                    className="launch-row"
                  >
                    <div className="l-avatar">{alert.tokenSymbol.slice(0, 2).toUpperCase()}</div>
                    <div className="l-body">
                      <div className="l-name">
                        {alert.title}
                        <span className="l-symbol">${alert.tokenSymbol}</span>
                      </div>
                      <div className="l-meta">{alert.body}</div>
                    </div>
                    <div className="l-metrics">
                      {isPersonaMatch ? (
                        <span className="type-pill">{activePersonaLabel}</span>
                      ) : null}
                      <span className={toneClass}>{alert.severity}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                        {relativeTime(alert.createdAt)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AlertsTabView>
  );
}
