import {
  getRecentDeploys,
  getRecentFailures,
  getRecentOperationalEvents,
  getWorkerHealth,
  listActionRequests,
} from "@jaguar/db";

import { ApprovalsPanel } from "./approvals-panel";

export const dynamic = "force-dynamic";

const noticeCopy: Record<string, string> = {
  approved: "Action approved — queued for the ops-runner.",
  rejected: "Action rejected.",
  operator_invalid: "Operator secret missing or invalid.",
  reason_required: "A reject reason is required.",
  stale: "That action was no longer pending (already resolved).",
  missing: "Missing action id.",
};

type PageProps = {
  searchParams?: Promise<{ notice?: string }>;
};

export default async function OpsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const notice = params?.notice ? noticeCopy[params.notice] : null;

  const [health, pending, recentActions, deploys, failures, events] = await Promise.all([
    getWorkerHealth(),
    listActionRequests({ status: "proposed", limit: 25 }),
    listActionRequests({
      statuses: ["approved", "executing", "executed", "failed", "rejected"],
      limit: 10,
    }),
    getRecentDeploys(8),
    getRecentFailures({ windowMinutes: 60, recentLimit: 8 }),
    getRecentOperationalEvents({ limit: 15 }),
  ]);

  const healthStatus = health?.assessment.status ?? "offline";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ops</h1>
          <div className="sub">
            Incident surface for Jaguar — worker health, deploys, failures, and approval-gated
            actions.
          </div>
        </div>
      </div>

      {notice ? <div className="settings-flash">{notice}</div> : null}

      <div className="settings-grid">
        <section className="card settings-panel">
          <div className="settings-panel-head">
            <div>
              <h3>Worker health</h3>
              <p>Live classification from heartbeat + stream/candle freshness.</p>
            </div>
            <span className={healthStatus === "healthy" ? "status-chip connected" : "status-chip"}>
              {healthStatus.toUpperCase()}
            </span>
          </div>
          <div className="settings-list">
            {health ? (
              <>
                <div className="settings-row">
                  <span>Reasons</span>
                  <strong>{health.assessment.reasons.join("; ")}</strong>
                </div>
                <div className="settings-row">
                  <span>Chain</span>
                  <strong>{health.chainName}</strong>
                </div>
                <div className="settings-row">
                  <span>Tracked pairs</span>
                  <strong>{health.trackedPairCount}</strong>
                </div>
                <div className="settings-row">
                  <span>Last heartbeat</span>
                  <strong>{health.heartbeatAt}</strong>
                </div>
                <div className="settings-row">
                  <span>Started</span>
                  <strong>{health.startedAt}</strong>
                </div>
              </>
            ) : (
              <div className="settings-note">
                No heartbeat recorded — worker may never have started.
              </div>
            )}
          </div>
        </section>

        <section className="card settings-panel">
          <div className="settings-panel-head">
            <div>
              <h3>Recent failures</h3>
              <p>
                Last {failures.windowMinutes}m · {failures.criticalAlertCount} critical alerts
              </p>
            </div>
            <span className={failures.totalFailures > 0 ? "status-chip connected" : "status-chip"}>
              {failures.totalFailures}
            </span>
          </div>
          <div className="settings-list">
            {failures.operationalFailures.length === 0 ? (
              <div className="settings-note">No failures in the window.</div>
            ) : (
              failures.operationalFailures.map((g) => (
                <div className="settings-row" key={g.type}>
                  <span>{g.type}</span>
                  <strong>{g.count}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <ApprovalsPanel pending={pending} />

        <section className="card settings-panel">
          <div className="settings-panel-head">
            <div>
              <h3>Recent deploys</h3>
            </div>
          </div>
          <div className="settings-list">
            {deploys.length === 0 ? (
              <div className="settings-note">No deploys recorded.</div>
            ) : (
              deploys.map((d) => (
                <div className="settings-row" key={d.id}>
                  <span>
                    {d.service} · {d.shortSha}
                  </span>
                  <strong>{d.detectedAt}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card settings-panel">
          <div className="settings-panel-head">
            <div>
              <h3>Recent actions</h3>
            </div>
          </div>
          <div className="settings-list">
            {recentActions.length === 0 ? (
              <div className="settings-note">No recent actions.</div>
            ) : (
              recentActions.map((a) => (
                <div className="settings-row" key={a.id}>
                  <span>
                    {a.actionType} · {a.status}
                  </span>
                  <strong>{a.completedAt ?? a.approvedAt ?? a.createdAt}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card settings-panel settings-panel-wide">
          <div className="settings-panel-head">
            <div>
              <h3>Operational events</h3>
            </div>
          </div>
          <div className="settings-list">
            {events.length === 0 ? (
              <div className="settings-note">No operational events.</div>
            ) : (
              events.map((e) => (
                <div className="settings-row" key={e.id}>
                  <span>
                    [{e.severity.toUpperCase()}] {e.type} · {e.subsystem}
                  </span>
                  <strong>{e.createdAt}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
