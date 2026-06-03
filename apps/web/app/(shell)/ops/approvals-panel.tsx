"use client";

import type { ActionRequestRecord } from "@jaguar/db";
import { type CSSProperties, useState } from "react";

import { approveAction, rejectAction } from "./actions";

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border, #2a2a35)",
  background: "var(--surface, #14141b)",
  color: "inherit",
  fontSize: 13,
};

export function ApprovalsPanel({ pending }: { pending: ActionRequestRecord[] }) {
  // One operator secret shared across all rows; never persisted.
  const [secret, setSecret] = useState("");

  return (
    <section className="card settings-panel settings-panel-wide">
      <div className="settings-panel-head">
        <div>
          <h3>Pending approvals</h3>
          <p>Halo proposes; you approve. Approved actions are executed by the VPS ops-runner.</p>
        </div>
        <span className={pending.length > 0 ? "status-chip connected" : "status-chip"}>
          {pending.length} pending
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        <span className="settings-label">Operator secret</span>
        <input
          type="password"
          autoComplete="off"
          placeholder="Required to approve or reject"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{ ...inputStyle, maxWidth: 360 }}
        />
      </div>

      {pending.length === 0 ? (
        <div className="settings-note">No action requests are awaiting approval.</div>
      ) : (
        <div className="settings-list">
          {pending.map((a) => (
            <div
              key={a.id}
              className="settings-row"
              style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong>
                  {a.title}{" "}
                  <span style={{ opacity: 0.6, textTransform: "uppercase", fontSize: 11 }}>
                    {a.actionType} · {a.riskLevel} risk
                  </span>
                </strong>
                <small style={{ opacity: 0.8 }}>{a.reason}</small>
                {a.payload ? (
                  <small style={{ opacity: 0.6 }}>payload: {JSON.stringify(a.payload)}</small>
                ) : null}
                <small style={{ opacity: 0.5 }}>
                  {a.id} · proposed {a.createdAt}
                </small>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <form action={approveAction} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="operatorSecret" value={secret} />
                  <button className="settings-primary-action" type="submit">
                    Approve
                  </button>
                </form>
                <form
                  action={rejectAction}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="operatorSecret" value={secret} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="Reject reason"
                    style={{ ...inputStyle, width: 160 }}
                  />
                  <button className="settings-primary-action settings-danger-action" type="submit">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
