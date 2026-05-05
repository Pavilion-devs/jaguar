import Link from "next/link";
import { notFound } from "next/navigation";

import { getLatestAgentMemo, getLaunchDetail } from "@jaguar/db";
import type { Persona } from "@jaguar/domain";

import { AgentMemoCard } from "@/components/dashboard/agent-memo-card";
import { ConvictionDeltaChart } from "@/components/dashboard/conviction-delta-chart";
import { PersonaSwitcher } from "@/components/dashboard/persona-switcher";

import { StatCard } from "@/components/dashboard/stat-card";
import {
  launchPersonaScore,
  launchPersonaVerdict,
  normalizePersona,
  personaDescription,
  personaLabel,
  withPersonaParam,
} from "@/lib/persona";

export const dynamic = "force-dynamic";

type LaunchPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    persona?: string;
  }>;
};

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatPnl = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
};

const PERSONAS: readonly Persona[] = ["degen", "momentum", "risk-first"];

const ScoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Score</title>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" opacity={0.5} />
  </svg>
);

const VerdictIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Verdict</title>
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LiquidityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Liquidity</title>
    <path
      d="M4 13c3-5 6-7 8-7s5 2 8 7c-3 5-6 7-8 7s-5-2-8-7Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

const MarketCapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Market cap</title>
    <path
      d="M4 20V10M10 20V4M16 20v-7M22 20V8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export default async function LaunchDetailPage({ params, searchParams }: LaunchPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const activePersona = normalizePersona(query?.persona);
  const [detail, agentMemo] = await Promise.all([getLaunchDetail(id), getLatestAgentMemo(id)]);
  if (!detail) notFound();

  const { launch, timeline, recommendations, metadata } = detail;
  const activePersonaScore = launchPersonaScore(launch, activePersona);
  const activePersonaVerdict = launchPersonaVerdict(launch, activePersona);

  return (
    <>
      <div className="page-head with-actions">
        <div>
          <Link
            href={withPersonaParam("/launches", activePersona)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--ink-dim)",
              marginBottom: 10,
            }}
          >
            ← Launches
          </Link>
          <h1 style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            {launch.tokenName || launch.tokenSymbol}
            <span style={{ fontSize: 18, fontWeight: 500, color: "var(--ink-dim)" }}>
              ${launch.tokenSymbol}
            </span>
          </h1>
          <div className="sub">
            {launch.protocol.replace(/_/g, " ")} · pair {metadata.pairAddress.slice(0, 6)}…
            {metadata.pairAddress.slice(-4)} · {personaLabel(activePersona)} lens ·{" "}
            {personaDescription(activePersona)}
          </div>
        </div>
        <PersonaSwitcher activePersona={activePersona} basePath={`/launches/${id}`} />
      </div>

      <div className="dash-grid">
        <StatCard
          variant="stat-1"
          dark
          title={`${personaLabel(activePersona)} score`}
          value={String(activePersonaScore)}
          footIcon={<ScoreIcon />}
          footText={`${launch.delta5m >= 0 ? "+" : ""}${launch.delta5m} over 5m`}
        />
        <StatCard
          variant="stat-2"
          title="Persona verdict"
          value={activePersonaVerdict.toUpperCase()}
          footIcon={<VerdictIcon />}
          footText={`${launch.reasons.length} reason${launch.reasons.length === 1 ? "" : "s"}`}
        />
        <StatCard
          variant="stat-3"
          title="Liquidity"
          value={compactCurrency.format(launch.liquidityUsd)}
          footIcon={<LiquidityIcon />}
          footText={`${launch.swapCount5m} swaps in 5m`}
        />
        <StatCard
          variant="stat-4"
          title="Market cap"
          value={compactCurrency.format(launch.marketCapUsd)}
          footIcon={<MarketCapIcon />}
          footText={`Quote ${launch.quoteRateUsd ? `$${launch.quoteRateUsd.toFixed(6)}` : "—"}`}
        />

        <ConvictionDeltaChart
          delta1m={launch.delta1m}
          delta5m={launch.delta5m}
          delta15m={launch.delta15m}
          delta1h={launch.delta1h}
          score={activePersonaScore}
        />

        <AgentMemoCard
          launchId={launch.id}
          agentMemo={agentMemo}
          currentScore={activePersonaScore}
          currentVerdict={activePersonaVerdict}
          activePersona={activePersona}
          activePersonaLabel={personaLabel(activePersona)}
        />

        <div className="card c-discovery">
          <div className="list-head">
            <h3>Persona verdicts</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "6px 0" }}>
            {PERSONAS.map((persona) => {
              const v = launch.personaVerdicts[persona];
              const pillClass =
                v === "enter"
                  ? "verdict-pill enter"
                  : v === "watch"
                    ? "verdict-pill watch"
                    : "verdict-pill ignore";
              return (
                <div
                  key={persona}
                  className={persona === activePersona ? "persona-row active" : "persona-row"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 22px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink)",
                      textTransform: "capitalize",
                    }}
                  >
                    {persona.replace("-", " ")}
                  </span>
                  <span className={pillClass}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card c-launches-full">
          <div className="list-head">
            <h3>Timeline</h3>
            <span className="count-pill muted">{timeline.length} events</span>
          </div>
          {timeline.length === 0 ? (
            <div className="empty-state">
              <strong>No timeline events yet</strong>
              Jaguar records events as GoldRush pushes updates. The first updatePairs or OHLCV
              candle will land here.
            </div>
          ) : (
            <div className="list-rows">
              {timeline.map((entry) => {
                const sevClass =
                  entry.severity === "critical"
                    ? "verdict-pill ignore"
                    : entry.severity === "warn"
                      ? "verdict-pill watch"
                      : "verdict-pill enter";
                return (
                  <div key={entry.id} className="launch-row" style={{ cursor: "default" }}>
                    <div className="l-avatar">{entry.severity.charAt(0).toUpperCase()}</div>
                    <div className="l-body">
                      <div className="l-name">{entry.title}</div>
                      <div className="l-meta">{entry.summary}</div>
                    </div>
                    <div className="l-metrics">
                      <span className={sevClass}>{entry.severity}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                        {relativeTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {recommendations.length > 0 ? (
          <div className="card c-launches-full">
            <div className="list-head">
              <h3>Paper trades on this launch</h3>
              <span className="count-pill">{recommendations.length} total</span>
            </div>
            <div className="list-rows">
              {recommendations.map((rec) => {
                const outcome = rec.latestOutcome;
                const pnlPill = !outcome
                  ? "verdict-pill watch"
                  : outcome.priceChangePct >= 0
                    ? "verdict-pill enter"
                    : "verdict-pill ignore";
                return (
                  <div key={rec.id} className="launch-row" style={{ cursor: "default" }}>
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
                        <span className={pnlPill}>{formatPnl(outcome.priceChangePct)}</span>
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
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
