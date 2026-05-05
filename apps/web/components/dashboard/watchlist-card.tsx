import Link from "next/link";

import type { Persona, ScoredLaunch } from "@jaguar/domain";

import { DEFAULT_PERSONA, launchPersonaScore, personaLabel, withPersonaParam } from "@/lib/persona";

type Props = {
  launches: ScoredLaunch[];
  persona?: Persona;
};

const TONES = ["purple", "green", "pink", "amber", "blue"] as const;

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

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Watch</title>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Add</title>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export function WatchlistCard({ launches, persona = DEFAULT_PERSONA }: Props) {
  return (
    <div className="card c-project">
      <div className="plist-head">
        <h3>Watchlist</h3>
        <Link href={withPersonaParam("/launches", persona)} className="plist-new">
          <PlusIcon />
          View all
        </Link>
      </div>

      {launches.length === 0 ? (
        <div className="empty-state">
          <strong>No conviction launches yet</strong>
          The watchlist will fill once Jaguar has enough real flow to score.
        </div>
      ) : (
        <div className="plist">
          {launches.map((launch, i) => {
            const tone = TONES[i % TONES.length];
            const activeScore = launchPersonaScore(launch, persona);
            return (
              <Link
                key={launch.id}
                href={withPersonaParam(`/launches/${launch.id}`, persona)}
                className="p-item"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className={`p-ic ${tone}`}>
                  <TargetIcon />
                </div>
                <div className="p-body">
                  <div className="p-name">{launch.tokenSymbol}</div>
                  <div className="p-meta">
                    {launch.protocol.replace(/_/g, " ")} · {relativeMinutes(launch.ageMinutes)} ·
                    liq {compactCurrency.format(launch.liquidityUsd)} · {personaLabel(persona)}{" "}
                    score {activeScore}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
