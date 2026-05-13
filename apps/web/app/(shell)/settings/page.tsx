import { getOrCreatePersonalAlertProfile } from "@jaguar/db";

import { createTelegramConnectToken } from "@/lib/telegram-connect";

const DEMO_WALLET_ADDRESS = "jaguar-demo-wallet";

const formatPersona = (persona: string) =>
  persona === "risk-first"
    ? "Risk-first"
    : `${persona.slice(0, 1).toUpperCase()}${persona.slice(1)}`;

export default async function SettingsPage() {
  const profile = await getOrCreatePersonalAlertProfile(DEMO_WALLET_ADDRESS);
  const connectToken = createTelegramConnectToken(profile.userProfileId);
  const telegramDeepLink = `https://t.me/Jaguarxyz_bot?start=connect_${connectToken}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="sub">
            Personalize how Jaguar interrupts you when a launch becomes actionable.
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card settings-panel settings-panel-main">
          <div className="settings-panel-head">
            <div>
              <h3>Telegram alerts</h3>
              <p>Connect Jaguar to a private Telegram chat for personal trade alerts.</p>
            </div>
            <span className={profile.telegram ? "status-chip connected" : "status-chip"}>
              {profile.telegram ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="telegram-connect-box">
            <div>
              <span className="settings-label">Connect link</span>
              <strong>Jaguarxyz_bot</strong>
              <p>
                Open this link in Telegram and press Start. Jaguar will link that Telegram chat to
                this alert profile.
              </p>
            </div>
            <a
              href={telegramDeepLink}
              className="settings-primary-action"
              target="_blank"
              rel="noreferrer"
            >
              Connect Telegram
            </a>
          </div>

          {profile.telegram ? (
            <div className="settings-row">
              <span>Telegram account</span>
              <strong>
                {profile.telegram.username
                  ? `@${profile.telegram.username}`
                  : profile.telegram.firstName || "Connected chat"}
              </strong>
            </div>
          ) : (
            <div className="settings-note">
              The bot webhook is the next implementation step; this page is the product shell and
              preference foundation.
            </div>
          )}
        </section>

        <section className="card settings-panel">
          <div className="settings-panel-head">
            <div>
              <h3>Alert profile</h3>
              <p>Defaulting to quiet, enter-only alerts.</p>
            </div>
            <span className={profile.preference.enabled ? "status-chip connected" : "status-chip"}>
              {profile.preference.enabled ? "Enabled" : "Paused"}
            </span>
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <span>Personas</span>
              <strong>{profile.preference.personas.map(formatPersona).join(", ")}</strong>
            </div>
            <div className="settings-row">
              <span>Verdicts</span>
              <strong>
                {profile.preference.verdicts.map((verdict) => verdict.toUpperCase()).join(", ")}
              </strong>
            </div>
            <div className="settings-row">
              <span>Minimum score</span>
              <strong>{profile.preference.minimumScore}+</strong>
            </div>
            <div className="settings-row">
              <span>Minimum liquidity</span>
              <strong>
                {profile.preference.minimumLiquidity
                  ? `$${profile.preference.minimumLiquidity.toLocaleString()}`
                  : "No floor"}
              </strong>
            </div>
            <div className="settings-row">
              <span>Max alerts</span>
              <strong>{profile.preference.maxAlertsPerHour}/hour</strong>
            </div>
          </div>
        </section>

        <section className="card settings-panel settings-panel-wide">
          <div className="settings-panel-head">
            <div>
              <h3>Next controls</h3>
              <p>These are the personalization controls this page is being prepared for.</p>
            </div>
          </div>

          <div className="settings-control-grid">
            <div className="settings-control">
              <span>Persona filters</span>
              <strong>Momentum, Degen, Risk-first</strong>
            </div>
            <div className="settings-control">
              <span>Verdict filters</span>
              <strong>ENTER or WATCH + ENTER</strong>
            </div>
            <div className="settings-control">
              <span>Noise controls</span>
              <strong>Score, liquidity, protocol, rate limits</strong>
            </div>
            <div className="settings-control">
              <span>Watch scopes</span>
              <strong>All calls, wallet holdings, manual watchlist</strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
