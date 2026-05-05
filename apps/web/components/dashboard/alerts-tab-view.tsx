"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { WalletHoldingSignal } from "@jaguar/db";

import { useWallet } from "@/lib/wallet-context";

type Tab = "all" | "holdings";

type HoldingsData = {
  holdings: { mint: string; amount: number }[];
  signals: WalletHoldingSignal[];
  demo?: boolean;
};

const DANGER = new Set(["SETUP_INVALIDATED", "LIQUIDITY_DROPPED", "BREAKOUT_FAILED"]);

const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
};

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" />
      <path
        d="M2 11h20M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ConnectPrompt({
  onConnect,
  connecting,
  onDemo,
}: {
  onConnect: () => void;
  connecting: boolean;
  onDemo: () => void;
}) {
  return (
    <div className="wh-connect-wrap">
      <div className="wh-connect-icon">
        <WalletIcon />
      </div>
      <div className="wh-connect-title">Monitor your holdings</div>
      <div className="wh-connect-sub">
        Connect your Phantom wallet and Jaguar will watch every token you hold — alerting you the
        moment a conviction signal degrades, liquidity thins, or a setup invalidates.
      </div>
      <button className="wh-connect-btn" onClick={onConnect} disabled={connecting} type="button">
        <WalletIcon />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      <button className="wh-demo-btn" onClick={onDemo} type="button">
        Try demo with live Jaguar data →
      </button>
    </div>
  );
}

function HoldingsView({
  publicKey,
  isDemo,
  onDisconnect,
  onExitDemo,
}: {
  publicKey?: string;
  isDemo?: boolean;
  onDisconnect?: () => void;
  onExitDemo?: () => void;
}) {
  const [data, setData] = useState<HoldingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const url = isDemo ? "/api/wallet/holdings?demo=1" : `/api/wallet/holdings?address=${publicKey}`;

  const load = () => {
    setLoading(true);
    setFetchError(null);
    setData(null);
    fetch(url)
      .then((r) => r.json() as Promise<HoldingsData & { error?: string }>)
      .then((d) => {
        if (d.error) setFetchError(d.error);
        else setData(d);
      })
      .catch(() => setFetchError("Request failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const short = (pk: string) => `${pk.slice(0, 6)}…${pk.slice(-4)}`;

  return (
    <>
      <div className="wh-toolbar">
        <div className="wh-addr">
          <span className="wh-dot" />
          {isDemo ? "Demo mode — live Jaguar data" : short(publicKey ?? "")}
        </div>
        <div className="wh-toolbar-actions">
          <button className="wh-action-btn" onClick={load} type="button" disabled={loading}>
            ↻ Refresh
          </button>
          {isDemo ? (
            <button className="wh-action-btn" onClick={onExitDemo} type="button">
              Exit demo
            </button>
          ) : (
            <button className="wh-action-btn wh-action-danger" onClick={onDisconnect} type="button">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="wh-state">Scanning {isDemo ? "demo wallet" : short(publicKey ?? "")} for tracked holdings…</div>
      )}

      {fetchError && (
        <div className="wh-state wh-state-err">{fetchError}</div>
      )}

      {!loading && !fetchError && data && (
        data.signals.length === 0 ? (
          <div className="card c-alert-list">
            <div className="empty-state">
              <strong>No tracked holdings</strong>
              {data.holdings.length > 0
                ? `${data.holdings.length} token${data.holdings.length !== 1 ? "s" : ""} found in your wallet. None are in Jaguar's active tracking window. Hold tokens from recent Solana launches to see live signals here.`
                : "No SPL token balances found for this wallet."}
            </div>
          </div>
        ) : (
          <div className="card c-alert-list">
            <div className="list-head">
              <h3>Tracked holdings</h3>
              <span className="count-pill">
                {data.signals.length} of {data.holdings.length} tokens tracked
              </span>
            </div>
            <div className="list-rows">
              {data.signals.map((s) => {
                const danger = s.reasonCodes.some((c) => DANGER.has(c));
                const alert = s.recentAlerts[0];
                const verdictClass =
                  s.verdict === "enter"
                    ? "verdict-pill enter"
                    : s.verdict === "watch"
                      ? "verdict-pill watch"
                      : "verdict-pill ignore";
                const deltaPos = s.delta5m >= 0;

                return (
                  <Link key={s.launchId} href={`/launches/${s.launchId}`} className="launch-row">
                    <div className="l-avatar">
                      {(s.baseTokenSymbol || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="l-body">
                      <div className="l-name">
                        {s.baseTokenName || s.baseTokenSymbol}
                        <span className="l-symbol">${s.baseTokenSymbol}</span>
                        {danger && <span className="wh-danger-tag">signal degraded</span>}
                      </div>
                      <div className="l-meta">
                        {alert ? alert.title : s.pairName}
                      </div>
                    </div>
                    <div className="l-metrics">
                      <span className={verdictClass}>{s.verdict}</span>
                      <span className="type-pill">{Math.round(s.score)}</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: deltaPos ? "var(--green-2)" : "#dc2626",
                          fontFamily: "Geist Mono, monospace",
                        }}
                      >
                        {deltaPos ? "+" : ""}{s.delta5m.toFixed(1)}
                      </span>
                      {alert && (
                        <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                          {relativeTime(alert.createdAt)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )
      )}
    </>
  );
}

export function AlertsTabView({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>("all");
  const [demo, setDemo] = useState(false);
  const { publicKey, connecting, connect, disconnect } = useWallet();

  // Real wallet connected → always use real data, exit demo
  const isConnected = !!publicKey;
  const showDemo = demo && !isConnected;

  return (
    <>
      <div className="alerts-tabs">
        <button
          className={`alerts-tab ${tab === "all" ? "active" : ""}`}
          onClick={() => setTab("all")}
          type="button"
        >
          All Alerts
        </button>
        <button
          className={`alerts-tab ${tab === "holdings" ? "active" : ""}`}
          onClick={() => setTab("holdings")}
          type="button"
        >
          My Holdings
          {!isConnected && !showDemo && <span className="alerts-tab-dot" />}
        </button>
      </div>

      {tab === "all" ? (
        <>{children}</>
      ) : (
        <div className="wh-view">
          {isConnected ? (
            <HoldingsView publicKey={publicKey} onDisconnect={disconnect} />
          ) : showDemo ? (
            <HoldingsView isDemo onExitDemo={() => setDemo(false)} />
          ) : (
            <ConnectPrompt
              onConnect={connect}
              connecting={connecting}
              onDemo={() => setDemo(true)}
            />
          )}
        </div>
      )}
    </>
  );
}
