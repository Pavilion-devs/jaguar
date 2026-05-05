import Link from "next/link";

import { getAnalystActivity } from "@jaguar/db";
import type { AnalystActivityRecord } from "@jaguar/domain";

import { StatCard } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

type AnalystFilter = "now" | AnalystActivityRecord["inboxStatus"];

type PageProps = {
  searchParams?: Promise<{
    filter?: string;
  }>;
};

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Activity</title>
    <path
      d="M4 13h4l2-6 4 12 2-6h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MemoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Memos</title>
    <path d="M6 4h9l3 3v13H6V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const AlertIcon = () => (
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

const CriticalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Critical</title>
    <path d="M12 3 3 20h18L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const typeLabel: Record<AnalystActivityRecord["type"], string> = {
  "memo-generated": "Memo",
  "alert-fired": "Alert",
  "timeline-event": "Signal",
  "paper-call-opened": "Call opened",
  "paper-call-settled": "Call settled",
};

const filterTabs: { key: AnalystFilter; label: string }[] = [
  { key: "now", label: "Now" },
  { key: "watch", label: "Watch" },
  { key: "entered", label: "Entered" },
  { key: "rejected", label: "Rejected" },
  { key: "settled", label: "Settled" },
];

const normalizeFilter = (value: string | undefined): AnalystFilter =>
  filterTabs.some((tab) => tab.key === value) ? (value as AnalystFilter) : "now";

const filterActivities = (
  activities: AnalystActivityRecord[],
  filter: AnalystFilter,
): AnalystActivityRecord[] => {
  if (filter === "now") return activities.filter((activity) => activity.inboxStatus !== "settled");
  return activities.filter((activity) => activity.inboxStatus === filter);
};

const filterCount = (
  activity: Awaited<ReturnType<typeof getAnalystActivity>>,
  filter: AnalystFilter,
) => {
  if (filter === "now") return activity.totalActivities - activity.settledCount;
  if (filter === "watch") return activity.watchCount;
  if (filter === "entered") return activity.enteredCount;
  if (filter === "rejected") return activity.rejectedCount;
  return activity.settledCount;
};

const verdictClass = (verdict: AnalystActivityRecord["verdict"]) => {
  if (verdict === "enter") return "verdict-pill enter";
  if (verdict === "watch") return "verdict-pill watch";
  return "verdict-pill ignore";
};

const statusClass = (status: AnalystActivityRecord["inboxStatus"]) => {
  if (status === "entered") return "status-dot entered";
  if (status === "rejected") return "status-dot rejected";
  if (status === "settled") return "status-dot settled";
  return "status-dot watch";
};

const statusLabel: Record<AnalystActivityRecord["inboxStatus"], string> = {
  watch: "Watch",
  entered: "Entered",
  rejected: "Rejected",
  settled: "Settled",
};

export default async function AnalystPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeFilter = normalizeFilter(params?.filter);
  const activity = await getAnalystActivity(40);
  const filteredActivities = filterActivities(activity.activities, activeFilter);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analyst</h1>
          <div className="sub">
            Autonomous analyst inbox for live memos, threshold calls, invalidations, and paper-trade
            follow-up backed by persisted GoldRush signals.
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <StatCard
          variant="stat-1"
          dark
          title="Now"
          value={String(activity.totalActivities - activity.settledCount)}
          footIcon={<ActivityIcon />}
          footText={
            activity.latestActivityAt
              ? `Latest ${relativeTime(activity.latestActivityAt)}`
              : "None yet"
          }
        />
        <StatCard
          variant="stat-2"
          title="Watches"
          value={String(activity.watchCount)}
          footIcon={<MemoIcon />}
          footText="Needs confirmation"
        />
        <StatCard
          variant="stat-3"
          title="Entered"
          value={String(activity.enteredCount)}
          footIcon={<AlertIcon />}
          footText="Actionable calls"
        />
        <StatCard
          variant="stat-4"
          title="Rejected"
          value={String(activity.rejectedCount)}
          footIcon={<CriticalIcon />}
          footText="Invalidated or ignored"
        />

        <div className="card c-analyst-feed">
          <div className="list-head">
            <h3>Analyst inbox</h3>
            <span className={filteredActivities.length > 0 ? "count-pill" : "count-pill muted"}>
              {filteredActivities.length} shown
            </span>
          </div>

          <div className="inbox-tabs" aria-label="Analyst inbox filters">
            {filterTabs.map((tab) => {
              const count = filterCount(activity, tab.key);
              const href = tab.key === "now" ? "/analyst" : `/analyst?filter=${tab.key}`;
              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={activeFilter === tab.key ? "inbox-tab active" : "inbox-tab"}
                >
                  <span>{tab.label}</span>
                  <strong>{count}</strong>
                </Link>
              );
            })}
          </div>

          {filteredActivities.length === 0 ? (
            <div className="empty-state">
              <strong>No inbox items in this filter</strong>
              Run the worker with live GoldRush traffic. Jaguar will populate this inbox when stored
              launches graduate, cross verdict thresholds, emit alerts, open paper calls, settle
              calls, or receive analyst memos.
            </div>
          ) : (
            <div className="analyst-inbox-list">
              {filteredActivities.map((item) => (
                <Link
                  key={item.id}
                  href={`/launches/${item.launchId}`}
                  className={`analyst-row ${item.inboxStatus}`}
                >
                  <div className={statusClass(item.inboxStatus)} />
                  <div className="l-avatar">{item.tokenSymbol.slice(0, 2).toUpperCase()}</div>
                  <div className="analyst-row-main">
                    <div className="analyst-row-top">
                      <span className="analyst-source">{item.sourceLabel}</span>
                      <span className="activity-time">{relativeTime(item.createdAt)}</span>
                      <span className="l-symbol">${item.tokenSymbol}</span>
                    </div>
                    <div className="analyst-decision">{item.decision}</div>
                    <div className="analyst-brief">
                      <div>
                        <span>Why</span>
                        <p>{item.why}</p>
                      </div>
                      <div>
                        <span>Risk</span>
                        <p>{item.risk}</p>
                      </div>
                      <div>
                        <span>Next</span>
                        <p>{item.nextCheck}</p>
                      </div>
                    </div>
                  </div>
                  <div className="analyst-row-side">
                    <span className="type-pill">{typeLabel[item.type]}</span>
                    <span className={`inbox-status-pill ${item.inboxStatus}`}>
                      {statusLabel[item.inboxStatus]}
                    </span>
                    <div className="analyst-side-meta">
                      {item.verdict ? (
                        <span className={verdictClass(item.verdict)}>{item.verdict}</span>
                      ) : null}
                      {typeof item.score === "number" ? (
                        <span className={item.score >= 30 ? "score-pill" : "score-pill low"}>
                          <span className="score-dot" />
                          {item.score}
                        </span>
                      ) : null}
                      {item.modelUsed ? <span className="model-pill">{item.modelUsed}</span> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
