import { getOrCreatePersonalAlertProfile } from "@jaguar/db";
import { PERSONAS, SOLANA_PROTOCOLS } from "@jaguar/domain";

import { createTelegramConnectToken } from "@/lib/telegram-connect";
import { sendTelegramTestAlert, updateAlertSettings } from "./actions";

const DEMO_WALLET_ADDRESS = "jaguar-demo-wallet";

const noticeCopy: Record<string, string> = {
  saved: "Alert profile saved.",
  test_sent: "Test alert sent to Telegram.",
  test_failed: "Telegram test failed. Check the bot token and chat connection.",
  connect_first: "Connect Telegram before sending a test alert.",
  bot_missing: "Telegram bot token is missing in the web runtime.",
  invalid: "One of the numeric settings is invalid.",
};

const formatPersona = (persona: string) =>
  persona === "risk-first"
    ? "Risk-first"
    : `${persona.slice(0, 1).toUpperCase()}${persona.slice(1)}`;

const formatProtocol = (protocol: string) =>
  protocol
    .toLowerCase()
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

type PageProps = {
  searchParams?: Promise<{
    notice?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const profile = await getOrCreatePersonalAlertProfile(DEMO_WALLET_ADDRESS);
  const connectToken = createTelegramConnectToken(profile.userProfileId);
  const telegramDeepLink = `https://t.me/Jaguarxyz_bot?start=connect_${connectToken}`;
  const notice = params?.notice ? noticeCopy[params.notice] : null;
  const enabledProtocols = new Set(profile.preference.protocols);

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

      {notice ? <div className="settings-flash">{notice}</div> : null}

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
              <span className="settings-label">
                {profile.telegram ? "Connected bot" : "Connect link"}
              </span>
              <strong>Jaguarxyz_bot</strong>
              {profile.telegram ? (
                <p>
                  This Telegram chat is linked to your alert profile. Use reconnect only if you want
                  to move alerts to another chat.
                </p>
              ) : (
                <p>
                  Open this link in Telegram and press Start. Jaguar will link that Telegram chat to
                  this alert profile.
                </p>
              )}
            </div>
            <a
              href={telegramDeepLink}
              className={
                profile.telegram
                  ? "settings-primary-action settings-secondary-action"
                  : "settings-primary-action"
              }
              target="_blank"
              rel="noreferrer"
            >
              {profile.telegram ? "Reconnect" : "Connect Telegram"}
            </a>
          </div>

          {profile.telegram ? (
            <>
              <div className="settings-row">
                <span>Telegram account</span>
                <strong>
                  {profile.telegram.username
                    ? `@${profile.telegram.username}`
                    : profile.telegram.firstName || "Connected chat"}
                </strong>
              </div>
              <form action={sendTelegramTestAlert} className="settings-action-row">
                <span>Send a harmless setup check to this Telegram chat.</span>
                <button className="settings-primary-action settings-secondary-action" type="submit">
                  Send test
                </button>
              </form>
            </>
          ) : (
            <div className="settings-note">
              Connect Telegram first, then send a test alert to verify the private chat.
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
              <h3>Alert controls</h3>
              <p>Tune what earns a Telegram interruption.</p>
            </div>
          </div>

          <form action={updateAlertSettings} className="settings-form">
            <label className="settings-toggle-row">
              <span>
                <strong>Telegram alerts</strong>
                <small>Pause delivery without disconnecting the bot.</small>
              </span>
              <input type="checkbox" name="enabled" defaultChecked={profile.preference.enabled} />
            </label>

            <fieldset className="settings-fieldset">
              <legend>Personas</legend>
              <div className="settings-option-grid">
                {PERSONAS.map((persona) => (
                  <label className="settings-check" key={persona}>
                    <input
                      type="checkbox"
                      name="personas"
                      value={persona}
                      defaultChecked={profile.preference.personas.includes(persona)}
                    />
                    <span>{formatPersona(persona)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="settings-fieldset">
              <legend>Verdicts</legend>
              <div className="settings-option-grid compact">
                {(["watch", "enter"] as const).map((verdict) => (
                  <label className="settings-check" key={verdict}>
                    <input
                      type="checkbox"
                      name="verdicts"
                      value={verdict}
                      defaultChecked={profile.preference.verdicts.includes(verdict)}
                    />
                    <span>{verdict.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="settings-number-grid">
              <label>
                <span>Minimum score</span>
                <input
                  type="number"
                  name="minimumScore"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={profile.preference.minimumScore}
                />
              </label>
              <label>
                <span>Minimum liquidity</span>
                <input
                  type="number"
                  name="minimumLiquidity"
                  min={0}
                  step={100}
                  placeholder="No floor"
                  defaultValue={profile.preference.minimumLiquidity ?? ""}
                />
              </label>
              <label>
                <span>Max alerts/hour</span>
                <input
                  type="number"
                  name="maxAlertsPerHour"
                  min={1}
                  max={60}
                  step={1}
                  defaultValue={profile.preference.maxAlertsPerHour}
                />
              </label>
            </div>

            <fieldset className="settings-fieldset">
              <legend>Protocols</legend>
              <p>Leave every protocol unchecked to allow all current Solana protocols.</p>
              <div className="settings-option-grid protocols">
                {SOLANA_PROTOCOLS.map((protocol) => (
                  <label className="settings-check" key={protocol}>
                    <input
                      type="checkbox"
                      name="protocols"
                      value={protocol}
                      defaultChecked={enabledProtocols.has(protocol)}
                    />
                    <span>{formatProtocol(protocol)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="settings-submit-row">
              <span>Changes affect the next worker alert drain.</span>
              <button className="settings-primary-action" type="submit">
                Save alert profile
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
