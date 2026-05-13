# Jaguar Personal Alerts Plan

## Product Goal

Turn Jaguar from a shared market dashboard into a personal trading analyst.

The Telegram integration should not be just a notification channel. It should let each user tell Jaguar what kind of launch deserves their attention, then receive only the alerts that match that profile.

## Current State

Jaguar already supports a production worker-level Telegram delivery path:

- A bot token and chat id are configured through worker environment variables.
- The worker sends momentum `ENTER` alerts to that configured Telegram destination.
- Alert delivery is deduped through stored alert delivery markers.

This is useful for the project/operator, but not yet personalized per user.

## Recommended Build Order

### 1. User Alert Profile Model

Add database models for:

- `UserProfile`
  - Stable user identity.
  - Initially wallet-address based.
  - Later can support email/social auth.
- `TelegramConnection`
  - Stores Telegram `chatId`, username, display name, and connection status.
  - Belongs to a `UserProfile`.
- `AlertPreference`
  - Stores each user's alert rules.
  - Default should be quiet: momentum `ENTER` only.
- `AlertDelivery`
  - Stores per-user/per-channel/per-alert delivery state.
  - Prevents duplicate sends across worker restarts.

### 2. Telegram Connect Flow

Add a dashboard settings experience:

- A `Connect Telegram` button.
- Jaguar generates a short-lived signed connect token.
- UI shows a deep link:
  - `https://t.me/Jaguarxyz_bot?start=connect_<token>`
- User opens Telegram and taps Start.
- Telegram webhook receives `/start connect_<token>`.
- Jaguar links the Telegram chat to the user's profile.
- UI shows connected state and a disconnect option.

Telegram start payloads are size-limited, so Jaguar should use compact signed tokens rather than long JWTs. The token should contain the profile id, an expiry timestamp, and a truncated HMAC signature.

### 3. Per-User Alert Fanout

Move from one global Telegram destination to user-specific fanout:

- Worker observes an alert, recommendation, or verdict transition.
- Worker finds all connected users whose preferences match the alert.
- Worker sends Telegram messages to those users.
- Worker records `AlertDelivery` rows so every user receives an alert at most once per matching event.

The existing global Telegram env path can remain as an operator/admin alert channel.

### 4. Preference UI

Let each user configure:

- Persona filters:
  - Momentum
  - Degen
  - Risk-first
- Verdict filters:
  - Default: `ENTER`
  - Optional: `WATCH + ENTER`
- Minimum score.
- Minimum liquidity.
- Protocol filters:
  - pump.fun
  - Meteora
  - Raydium
  - others from the tracked protocol list
- Max alerts per hour.
- Quiet hours.
- Delivery channels:
  - Telegram first
  - Email/Discord later

### 5. Personal Watchlists

Add more personalized alert scopes:

- Global Jaguar calls matching preferences.
- Manually watched pairs/tokens.
- Wallet holdings.
- Tokens the user dismissed or muted.
- Existing calls that become invalidated.

This is where Jaguar starts feeling tailored instead of generic.

## Telegram Message Design

Messages should be concise but decision-useful:

- Token symbol and name.
- Persona and verdict.
- Score.
- Entry price.
- Liquidity and market cap.
- Top reasons.
- Main risk, when available.
- Link back to the launch detail page.

Later, add Telegram inline buttons:

- `Open launch`
- `Mute token`
- `Watch this`
- `Too noisy`

## Default Product Stance

Default behavior should be low-noise:

- Momentum persona only.
- `ENTER` alerts only.
- Deduped per user.
- Rate limited.
- No discovery-only alerts.

Jaguar should interrupt users only when it has a clear reason.

## Implementation Notes

- Use wallet address as the first user identity anchor.
- Keep Telegram tokens and webhook secrets in environment variables.
- Do not store bot tokens in the database.
- Store Telegram chat ids per user.
- Record every per-user send in `AlertDelivery`.
- Keep the current global Telegram env delivery path until per-user delivery is stable.

## Next Implementation Slice

Start with:

1. Prisma models for user profiles, Telegram connections, alert preferences, and alert deliveries.
2. DB helpers for creating connect tokens and resolving Telegram connections.
3. Web settings page shell for alert preferences.
4. Telegram webhook route for `/start connect_<token>`.
