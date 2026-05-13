import { createHmac, timingSafeEqual } from "node:crypto";

const CONNECT_TTL_SECONDS = 30 * 60;
const SIGNATURE_LENGTH = 20;

const getTelegramConnectSecret = () =>
  process.env.TELEGRAM_CONNECT_SECRET ??
  process.env.TELEGRAM_BOT_TOKEN ??
  "jaguar-local-telegram-connect-secret";

const sign = (value: string) =>
  createHmac("sha256", getTelegramConnectSecret())
    .update(value)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);

export const createTelegramConnectToken = (userProfileId: string) => {
  const expiresAt = Math.floor(Date.now() / 1000) + CONNECT_TTL_SECONDS;
  const payload = `${userProfileId}.${expiresAt.toString(36)}`;
  return `${payload}.${sign(payload)}`;
};

export const verifyTelegramConnectToken = (token: string): { userProfileId: string } | null => {
  const [userProfileId, rawExpiresAt, signature, ...extra] = token.split(".");
  if (!userProfileId || !rawExpiresAt || !signature || extra.length > 0) {
    return null;
  }

  const payload = `${userProfileId}.${rawExpiresAt}`;
  const expected = sign(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const expiresAt = Number.parseInt(rawExpiresAt, 36);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { userProfileId };
};
