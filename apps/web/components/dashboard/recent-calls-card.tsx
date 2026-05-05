import Link from "next/link";

import type { Persona, Recommendation } from "@jaguar/domain";

import { DEFAULT_PERSONA, withPersonaParam } from "@/lib/persona";

type Props = {
  recommendations: Recommendation[];
  persona?: Persona;
};

const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
};

const personaTone: Record<string, "a1" | "a2" | "a3" | "a4"> = {
  degen: "a1",
  momentum: "a2",
  "risk-first": "a3",
};

const statusClass = (status: string) =>
  status === "validated" ? "completed" : status === "failed" ? "pending" : "progress";

const prettyStatus = (status: string) =>
  status === "pending" ? "Open" : status.charAt(0).toUpperCase() + status.slice(1);

const personaInitials = (persona: string) => {
  if (persona === "degen") return "DG";
  if (persona === "momentum") return "MM";
  if (persona === "risk-first") return "RF";
  return persona.slice(0, 2).toUpperCase();
};

export function RecentCallsCard({ recommendations, persona = DEFAULT_PERSONA }: Props) {
  return (
    <div className="card c-team">
      <div className="team-head">
        <h3>Recent Calls</h3>
        <Link
          href={withPersonaParam("/scorecard", persona)}
          className="add-member"
          style={{ textDecoration: "none" }}
        >
          See all →
        </Link>
      </div>

      {recommendations.length === 0 ? (
        <div className="empty-state">
          <strong>No calls yet</strong>
          Jaguar opens paper trades as conviction-lane launches cross watch and enter thresholds.
        </div>
      ) : (
        <div className="team-list">
          {recommendations.slice(0, 4).map((rec) => (
            <Link
              key={rec.id}
              href={withPersonaParam(`/launches/${rec.launchId}`, persona)}
              className="team-row"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className={`t-avatar ${personaTone[rec.persona] ?? "a4"}`}>
                {personaInitials(rec.persona)}
              </div>
              <div className="t-body">
                <div className="t-name" style={{ textTransform: "capitalize" }}>
                  {rec.persona.replace("-", " ")} persona
                </div>
                <div className="t-task">
                  {rec.verdict.toUpperCase()} at ${rec.priceAtEntryUsd.toFixed(5)} · score{" "}
                  <b>{rec.scoreAtEntry}</b> · {relativeTime(rec.issuedAt)}
                </div>
              </div>
              <span className={`status-pill ${statusClass(rec.evaluationStatus)}`}>
                {prettyStatus(rec.evaluationStatus)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
