import Link from "next/link";

import type { Persona, ScoredLaunch } from "@jaguar/domain";

import {
  DEFAULT_PERSONA,
  launchPersonaScore,
  launchPersonaVerdict,
  personaLabel,
  withPersonaParam,
} from "@/lib/persona";

type Props = {
  title: string;
  subtitle?: string;
  launches: ScoredLaunch[];
  variant: "c-conviction" | "c-discovery" | "c-launches-full";
  countLabel?: string;
  muted?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  persona?: Persona;
};

const TONES = ["tone-default", "tone-purple", "tone-pink", "tone-amber", "tone-blue"] as const;

const avatarInitials = (symbol: string) => symbol.slice(0, 2).toUpperCase() || "··";

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const relativeMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const formatSignedDelta = (delta: number) => `${delta >= 0 ? "+" : ""}${delta}`;

const deltaToneClass = (delta: number) => {
  if (delta > 0) return "delta-pill pos";
  if (delta < 0) return "delta-pill neg";
  return "delta-pill";
};

export function LaunchListCard({
  title,
  subtitle,
  launches,
  variant,
  countLabel,
  muted,
  emptyTitle,
  emptyBody,
  persona = DEFAULT_PERSONA,
}: Props) {
  return (
    <div className={`card ${variant}`}>
      <div className="list-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h3>{title}</h3>
          {subtitle ? (
            <span
              style={{
                fontSize: 12.5,
                color: "var(--ink-dim)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
        <span className={muted ? "count-pill muted" : "count-pill"}>
          {countLabel ?? `${launches.length} live`}
        </span>
      </div>

      {launches.length === 0 ? (
        <div className="empty-state">
          <strong>{emptyTitle ?? "Nothing here yet"}</strong>
          {emptyBody}
        </div>
      ) : (
        <div className="list-rows">
          {launches.map((launch, i) => {
            const tone = TONES[i % TONES.length];
            const personaVerdict = launchPersonaVerdict(launch, persona);
            const activeScore = launchPersonaScore(launch, persona);
            const verdictClass =
              personaVerdict === "enter"
                ? "verdict-pill enter"
                : personaVerdict === "watch"
                  ? "verdict-pill watch"
                  : "verdict-pill ignore";
            const scoreClass = activeScore >= 30 ? "score-pill" : "score-pill low";

            return (
              <Link
                key={launch.id}
                href={withPersonaParam(`/launches/${launch.id}`, persona)}
                className="launch-row"
              >
                <div className={`l-avatar ${tone}`}>{avatarInitials(launch.tokenSymbol)}</div>
                <div className="l-body">
                  <div className="l-name">
                    {launch.tokenName || launch.tokenSymbol}
                    <span className="l-symbol">${launch.tokenSymbol}</span>
                  </div>
                  <div className="l-meta">
                    {launch.protocol.replace(/_/g, " ")} · {relativeMinutes(launch.ageMinutes)} ·
                    liq {compactCurrency.format(launch.liquidityUsd)} · {personaLabel(persona)} lens
                  </div>
                </div>
                <div className="l-metrics">
                  <span className={scoreClass}>
                    <span className="score-dot" />
                    {activeScore}
                  </span>
                  <span className="delta-group">
                    <span className={deltaToneClass(launch.delta5m)}>
                      <span className="delta-label">5m</span>
                      {formatSignedDelta(launch.delta5m)}
                    </span>
                    <span className={deltaToneClass(launch.delta15m)}>
                      <span className="delta-label">15m</span>
                      {formatSignedDelta(launch.delta15m)}
                    </span>
                  </span>
                  <span className={verdictClass}>{personaVerdict}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
