import Link from "next/link";

import type { Persona, Recommendation } from "@jaguar/domain";

import { DEFAULT_PERSONA, withPersonaParam } from "@/lib/persona";

type Props = {
  latest: Recommendation | null;
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

const Dots = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <title>More</title>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Time</title>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const OpenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Open</title>
    <path
      d="M7 17 17 7M8 7h9v9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function ReminderCard({ latest, persona = DEFAULT_PERSONA }: Props) {
  return (
    <div className="card c-reminder">
      <div className="rem-head">
        <h4>Latest call</h4>
        <span className="more">
          <Dots />
        </span>
      </div>
      {latest ? (
        <>
          <div className="rem-title" style={{ textTransform: "capitalize" }}>
            {latest.persona.replace("-", " ")}
            <br />
            {latest.verdict} call
          </div>
          <div className="rem-time">
            <ClockIcon />
            Entry ${latest.priceAtEntryUsd.toFixed(5)} · {relativeTime(latest.issuedAt)}
          </div>
          <Link
            href={withPersonaParam(`/launches/${latest.launchId}`, persona)}
            className="rem-btn"
            style={{ textDecoration: "none" }}
          >
            <OpenIcon />
            Open launch
          </Link>
        </>
      ) : (
        <>
          <div className="rem-title">
            No calls
            <br />
            opened yet
          </div>
          <div className="rem-time">
            <ClockIcon />
            Waiting on conviction-lane signal
          </div>
          <button className="rem-btn" type="button" disabled>
            <OpenIcon />
            Pending
          </button>
        </>
      )}
    </div>
  );
}
